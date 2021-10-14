
import { expect } from 'chai'
import sinon from 'sinon'
import test from 'ava'

// constants

let server, storage

function testCachedParts(t, addConfig, maxGetParts, partNumberMarker, evapCfg) {
  t.context.partNumberMarker = partNumberMarker
  t.context.maxGetParts = maxGetParts

  const evapConfig = {
    awsSignatureVersion: '2',
    s3FileCacheHoursAgo: 24
  }
  return testBase(t, addConfig, Object.assign({}, evapConfig, evapCfg))
      .then(function () {
        partNumberMarker = 0
        t.context.originalUploadObjectKey = t.context.requestedAwsObjectKey
        t.context.requestedAwsObjectKey = randomAwsKey()
        let reUpload = Object.assign({}, addConfig, {name: t.context.requestedAwsObjectKey});
        return evaporateAdd(t, t.context.evaporate, reUpload)
      })
}

test.before(() => {
  sinon.xhr.supportsCORS = true
  global.XMLHttpRequest = sinon.useFakeXMLHttpRequest()
  global.window = {
    localStorage: {},
    console: console
  };

  server = serverCommonCase()
  storage = global.localStorage
})

test.beforeEach((t) => {
  beforeEachSetup(t)
})

// Cached File Parts (some parts on S3), multipart upload not completed
test('should check for parts when re-uploading a cached file and not call cryptoMd5', (t) => {
  return testCachedParts(t, {}, 1, 0)
      .then(function () {
        expect(t.context.cryptoMd5.called).to.be.false
      })
})
test.serial('should check for parts when re-uploading a cached file and not call cryptoMd5, mocking localStorage', (t) => {
  return testCachedParts(t, {}, 1, 0, { mockLocalStorage: true })
      .then(function () {
        expect(t.context.cryptoMd5.called).to.be.false
      })
})
test('should check for parts when re-uploading a cached file with S3 requests in the correct order', (t) => {

  return testCachedParts(t, {}, 1, 0)
      .then(function () {
        expect(requestOrder(t)).to.equal('initiate,PUT:partNumber=1,PUT:partNumber=2,complete,check for parts,PUT:partNumber=2,complete')
      })
})
test.serial('should check for parts when re-uploading a cached file with S3 requests in the correct order, mocking localStorage', (t) => {

  return testCachedParts(t, {}, 1, 0, { mockLocalStorage: true })
      .then(function () {
        expect(requestOrder(t)).to.equal('initiate,PUT:partNumber=1,PUT:partNumber=2,complete,check for parts,PUT:partNumber=2,complete')