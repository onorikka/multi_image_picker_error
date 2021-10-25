
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

  const config = Object.assign({}, {
    started: sinon.spy(),
    cancelled: sinon.spy()
  },
      addConfig)

  return testCommon(t, config)
      .then(function () {
        t.context.cancelPromise = t.context.cancel()
        return t.context.cancelPromise
      })
}

test.before(() => {
  sinon.xhr.supportsCORS = true
  global.XMLHttpRequest = sinon.useFakeXMLHttpRequest()
  global.window = {
    localStorage: {},
    console: console
  };

  function partRequestHandler(xhr, context)  {
    if (context.pauseUpload) {
      if (xhr.url.indexOf('partNumber=1') > -1) {
          context.pause(context.forcePause)
              .then(context.pausedPromise.resolve)
      }
    }
    return true
  }

  server = serverCommonCase(partRequestHandler)
})

test.beforeEach((t) => {
  beforeEachSetup(t)

  t.context.cancel = function () {
    return t.context.evaporate.cancel(t.context.uploadId)
  }
  t.context.pause = function (force) {
    return t.context.evaporate.pause(t.context.uploadId, {force: force})
  }
})

// Default Setup: V2 signatures, Cancel
test('should Cancel an upload calling started once', (t) => {
  return testCancel(t)
      .then(function () {