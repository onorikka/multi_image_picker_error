
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
        },
        requests = testRequests[t.context.testId] || []
    requests.forEach(function (r) {
      var x = r.url.split('?'),
          y = x[1] ? x[1].split('&') : '',
          z = y[0] ? y[0].split('=')[0] : y
      if (z === 'partNumber') {
        z += '='
        z += y[0].split('=')[1]
      }

      var v = z ? r.method + ':' + z : r.method
      request_order.push(requestMap[v] || v)
    })

    return request_order.join(',')
  }

  return testCommon(t, { file: new File({
    path: '/tmp/file',
    size: 50,
    name: 'tests'
  })}, evapConfig)
      .then(function () {
        return Promise.resolve(requestOrder(t));
      })
      .catch(function (reason) {
        return Promise.reject(reason + " " + requestOrder(t));
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
})

test.beforeEach((t) => {
  beforeEachSetup(t)
})

// Default Setup: V2 signatures: Common Case
test('should not call cryptoMd5 upload a file with defaults and V2 signature', (t) => {
  return testCommon(t, {}, { awsSignatureVersion: '2' })
      .then(function () {
        expect(t.context.cryptoMd5.callCount).to.equal(0)
      })
})
test('should upload a file with S3 requests in the correct order', (t) => {
  return testCommon(t)
      .then(function () {
        expect(requestOrder(t)).to.equal('initiate,PUT:partNumber=1,PUT:partNumber=2,complete')
      })
})
test('should upload a file and return the correct file upload ID', (t) => {
  return testCommon(t)
      .then(function () {
        expect(t.context.completedAwsKey).to.equal(t.context.requestedAwsObjectKey)
      })
})
test('should upload a file and callback complete once', (t) => {
  return testCommon(t)
      .then(function () {
        expect(t.context.config.complete.calledOnce).to.be.true
      })
})
test('should upload a file and callback complete with first param instance of xhr', (t) => {
  return testCommon(t)
      .then(function () {
        expect(t.context.config.complete.firstCall.args[0]).to.be.instanceOf(sinon.FakeXMLHttpRequest)
      })
})