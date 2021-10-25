
import { expect } from 'chai'
import sinon from 'sinon'
import test from 'ava'

// constants

let server

function defer() {
  var deferred = {}, promise;
  promise = new Promise(function(resolve, reject){
    deferred = {resolve: resolve, reject: reject};
  });
  return {
    resolve: deferred.resolve,
    reject: deferred.reject,
    promise: promise
  }
}
function testCommon(t, addConfig, initConfig) {
  let evapConfig = Object.assign({}, {awsSignatureVersion: '2'}, initConfig)
  return testBase(t, addConfig, evapConfig)
}

function testCancel(t, addConfig) {
  addConfig = addConfig || {}
