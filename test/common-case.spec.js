
import { expect } from 'chai'
import sinon from 'sinon'
import test from 'ava'

// constants

let server

function testCommon(t, addConfig, initConfig) {
  let evapConfig = Object.assign({}, {awsSignatureVersion: '2'}, initConfig)
  return testBase(t, addConfig, evapConfig)
}
function testMd5V2(t) {
  return testCommon(t, {}, { awsSignatureVersion: '2', computeContentMd5: true })
}

function testMd5V4(t) {
  return testCommon(t, {}, {
    computeContentMd5: true,
    cryptoHexEncodedHash256: function (d) { return d; }
  })
}

function testSignerErrors(t, errorStatus, evapConfig) {
  t.context.retry = function (type) {
    return type === 'sign'
  }
  t.context.errorStatus = errorStatus

  function requestOrder() {
    let request_order = [],
        requestMap = {
          'GET:to_sign': 'sign',
          'POST:uploads': 'initiate',
          'POST:uploadId': 'complete',
          'DELETE:uploadId': 'cancel',
          'GET:uploadId': 'check for parts'