
import { expect } from 'chai'
import sinon from 'sinon'
import test from 'ava'

let server, storage

function testS3Reuse(t, addConfig2, headEtag, evapConfig2, mockConfig) {
  addConfig2 = addConfig2 || {}
  t.context.headEtag = headEtag

  let evapConfig = {
    allowS3ExistenceOptimization: true,
    s3FileCacheHoursAgo: 24,
    awsSignatureVersion: '2',
    computeContentMd5: true
  }

  // Upload the first time
  return testBase(t, {}, Object.assign({}, evapConfig, mockConfig))
      .then(function () {
        t.context.originalName = t.context.requestedAwsObjectKey
        addConfig2.name = randomAwsKey()
        // Upload the second time to trigger head
        evapConfig = Object.assign({}, evapConfig, evapConfig2, mockConfig)
        t.context.requestedAwsObjectKey = addConfig2.name
        return testBase(t, addConfig2, evapConfig)
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

// S3 Object re-use
test('should re-use S3 object and callback complete', (t) => {
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"')
      .then(function () {
        expect(t.context.config.complete.calledOnce).to.be.true
      })
})
test('should re-use S3 object with S3 requests correctly ordered', (t) => {
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"')
      .then(function () {
        expect(requestOrder(t)).to.equal(
            'initiate,PUT:partNumber=1,PUT:partNumber=2,complete,HEAD')
      })
})
test.serial('should not re-use S3 object with S3 requests correctly ordered, mocking localStorage', (t) => {
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"', {}, { mockLocalStorage: true })
      .then(function () {
        expect(requestOrder(t)).to.equal(
            'initiate,PUT:partNumber=1,PUT:partNumber=2,complete,initiate,PUT:partNumber=1,PUT:partNumber=2,complete')
      })
})
test.serial('should not re-use S3 object with S3 requests correctly ordered, no localStorage, not mocking', (t) => {
  global['localStorage'] = undefined
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"')
      .then(function () {
        global.localStorage = storage
        expect(requestOrder(t)).to.equal(
            'initiate,PUT:partNumber=1,PUT:partNumber=2,complete,initiate,PUT:partNumber=1,PUT:partNumber=2,complete')
      })
})
test('should re-use S3 object calling cryptomd5 correctly', (t) => {
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"')
      .then(function () {
        expect(t.context.completedAwsKey).to.not.equal(t.context.requestedAwsObjectKey)
      })
})
test.serial('should not re-use S3 object calling cryptomd5 correctly, mocking localStorage', (t) => {
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"', {}, { mockLocalStorage: true })
      .then(function () {
        expect(t.context.completedAwsKey).to.equal(t.context.requestedAwsObjectKey)
      })
})
test('should re-use S3 object returning the S3 file upload ID', (t) => {
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"')
      .then(function () {
        expect(t.context.completedAwsKey).to.not.equal(t.context.requestedAwsObjectKey)
      })
})
test.serial('should not re-use S3 object returning the S3 file upload ID, mocking localStorage', (t) => {
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"', {}, { mockLocalStorage: true })
      .then(function () {
        expect(t.context.completedAwsKey).to.equal(t.context.requestedAwsObjectKey)
      })
})
test.serial('should not re-use S3 object returning the S3 file upload ID, no localStorage, not mocking', (t) => {
  global['localStorage'] = undefined
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"')
      .then(function () {
        global.localStorage = storage
        expect(t.context.completedAwsKey).to.equal(t.context.requestedAwsObjectKey)
      })
})
test('should re-use S3 object and callback complete with first param instance of xhr', (t) => {
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"')
      .then(function () {
        expect(t.context.config.complete.firstCall.args[0]).to.be.instanceOf(sinon.FakeXMLHttpRequest)
      })
})
test('should re-use S3 object and callback complete with second param the reused awsKey', (t) => {
  return testS3Reuse(t, {}, '"b2969107bdcfc6aa30892ee0867ebe79-1"')
      .then(function () {
        expect(t.context.config.complete.firstCall.args[1]).to.equal(t.context.originalName)
      })
})
test('should re-use S3 object and callback with the new object name', (t) => {
  return testS3Reuse(t, {nameChanged: sinon.spy()}, '"b2969107bdcfc6aa30892ee0867ebe79-1"')
      .then(function () {
        expect(t.context.config.nameChanged.withArgs(t.context.originalName).calledOnce).to.be.true
      })
})

test('should not re-use S3 object if the first part\'s md5 digest do not match', (t) => {