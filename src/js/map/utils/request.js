import {analysisConfig, layersConfig, errors} from 'js/config';
import SpatialReference from 'esri/SpatialReference';
import GeoProcessor from 'esri/tasks/Geoprocessor';
import esriRequest from 'esri/request';
import Query from 'esri/tasks/query';
import Deferred from 'dojo/Deferred';
import utils from 'utils/AppUtils';
import KEYS from 'js/constants';

const request = {

  /**
  * @param {string} url - Url for an esri map service
  * @param {array} layerIds - An array of layer ids
  * @return {Deferred} deferred - A promise, will return either an array of layerInfos or an empty array
  */
  getLegendInfos: (url, layerIds) => {
    app.debug('Request >>> getLegendInfos');
    let deferred = new Deferred();

    esriRequest({
      url: `${url}/legend`,
      handleAs: 'json',
      callbackParamName: 'callback',
      content: { f: 'json' }
    }).then(res => {
      if (res && res.layers && res.layers.length > 0) {
        let layers = res.layers.filter(layer => layerIds.indexOf(layer.layerId) > -1);
        let legendInfos = layers.length === 1 ? layers[0].legend : layers.map(layer => layer.legend);
        deferred.resolve(legendInfos || []);
      }
    }, err => {
      console.error(err);
      deferred.resolve([]);
    });

    return deferred;
  },

  /**
  * @param {Point} geometry - Esri Point geometry to use as a query for a feature on the watershed service
  * @return {Deferred} deferred
  */
  getWatershedByGeometry: geometry => {
    app.debug('Request >>> getWatershedByGeometry');
    let layer = app.map.getLayer(KEYS.watershed);
    let deferred = new Deferred();
    let query = new Query();

    query.geometry = geometry;

    if (layer) {
      layer.queryFeatures(query, featureSet => {
        deferred.resolve(featureSet.features[0]);
      }, deferred.reject);
    } else {
      deferred.reject(false);
    }

    return deferred;
  },

  /**
  * @param {string} objectid - Objectid for a feature on the watershed service
  * @return {Deferred} deferred
  */
  getWatershedById: objectid => {
    app.debug('Request >>> getWatershedById');
    let config = utils.getObject(layersConfig, 'id', KEYS.watershed);
    let deferred = new Deferred();
    let content = {
      objectIds: [objectid],
      returnGeometry: true,
      outFields: ['*'],
      f: 'json'
    };

    esriRequest({
      url: `${config.url}/query`,
      handleAs: 'json',
      callbackParamName: 'callback',
      content: content
    }).then(response => {
      let {features} = response;
      if (features.length === 1) {
        deferred.resolve(features[0]);
      } else {
        deferred.reject(errors.featureNotFound);
      }
    }, deferred.reject);

    return deferred;
  },

  /**
  * Get Upstream Analysis
  * @param {object} - Valid esri geometry
  * @return {Deferred} - promise
  */
  getUpstreamAnalysis: geometry => {
    app.debug('Request >>> getUpstreamAnalysis');
    let {url, params, outputSR, jobId} = analysisConfig.upstream;
    let geoprocessor = new GeoProcessor(url);
    let deferred = new Deferred();

    params.InputPoints = utils.formatInputPointsForUpstream(geometry);
    geoprocessor.setOutputSpatialReference(new SpatialReference(outputSR));
    geoprocessor.submitJob(params, results => {
      console.log(results);
      geoprocessor.getResultData(results.jobId, jobId, data => {
        console.log('Get Results Data');
        console.log(data);
      });
    }, status => {
      console.debug(status);
    });

    return deferred;
  }

};

export {request as default};
