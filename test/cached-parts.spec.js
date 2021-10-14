
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
      })
})
test.serial('should not check for parts when re-uploading a cached file with S3 requests in the correct order, no localStorage, not mocking', (t) => {
  global['localStorage'] = undefined
  return testCachedParts(t, {}, 1, 0)
      .then(function () {
        global.localStorage = storage
        expect(requestOrder(t)).to.equal('initiate,PUT:partNumber=1,PUT:partNumber=2,complete,initiate,PUT:partNumber=1,PUT:partNumber=2,complete')
      })
})
test('should check for parts when re-uploading a cached file with S3 requests callback complete with first param instance of xhr', (t) => {
  return testCachedParts(t, {}, 1, 0)
      .then(function () {
        expect(t.context.config.complete.firstCall.args[0]).to.be.instanceOf(sinon.FakeXMLHttpRequest)
      })
})
test('should check for parts when re-uploading a cached file with S3 requests callback complete with second param the new awsKey', (t) => {
  return testCachedParts(t, {}, 1, 0)
      .then(function () {
        expect(t.context.config.complete.firstCall.args[1]).to.equal(t.context.originalUploadObjectKey)
      })
})
test('should check for parts when re-uploading a cached file and callback with the original object name', (t) => {

  return testCachedParts(t, {
        nameChanged: sinon.spy()
      }, 1, 0)
      .then(function () {
        expect(t.context.config.nameChanged.withArgs(t.context.originalUploadObjectKey).calledOnce).to.be.true
      })
})

test('should only upload remaining parts for an interrupted upload', (t) => {
  return testCachedParts(t, { file: new File({
    path: '/tmp/file',
    size: 29690176,
    name: randomAwsKey()
  })
  }, 3, 0)
      .then(function () {
        expect(requestOrder(t)).to.equal(
            'initiate,PUT:partNumber=1,PUT:partNumber=2,PUT:partNumber=3,PUT:partNumber=4,PUT:partNumber=5,complete,' +
            'check for parts,check for parts,check for parts,' +
            'PUT:partNumber=4,PUT:partNumber=5,complete')
      })
})
test('should check for parts when re-uploading a cached file when getParts 404s and callback started', (t) => {
  t.context.getPartsStatus = 404

  return testCachedParts(t, {}, 1, 0)
      .then(function () {
        expect(t.context.config.started.calledOnce).to.be.true
      })
})
test('should check for parts when re-uploading a cached file when getParts 404s and not callback with new object name', (t) => {
  t.context.getPartsStatus = 404

  return testCachedParts(t, {
    nameChanged: sinon.spy()
  }, 1, 0)
      .then(function () {
        expect(t.context.config.nameChanged.called).to.be.false
      })