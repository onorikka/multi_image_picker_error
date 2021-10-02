
import { expect } from 'chai'
import sinon from 'sinon'
import test from 'ava'

let server;

const signResponseHandler = function  (r) {
  return new Promise(function (resolve) {
    resolve('1234567890123456789012345srh');
  });
}

const customAuthHandler = function  () {
  return Promise.resolve('123456789012345678901234cstm');
}

function testCommonAuthorization(t, addCfg, evapConfig) {
  const addConfig = Object.assign({}, t.context.baseAddConfig, addCfg, {
    error: function (msg) {
      t.context.errMessages.push(msg);
    }})

  evapConfig = Object.assign({ s3FileCacheHoursAgo: 24 }, evapConfig)
  return testBase(t, addConfig, evapConfig);
}

function v2Authorization(signature) {
  return 'AWS testkey:' + signature
}
function testV2Authorization(t, initConfig, addCfg) {
  const config = {awsSignatureVersion: '2', signerUrl: 'http://what.ever/signv2'}
  const evapConfig = Object.assign({}, config, initConfig)

  return testCommonAuthorization(t, addCfg, evapConfig);
}
function testV2ToSign(t, request, amzHeaders, addConfig, evapConfig) {
  return testV2Authorization(t, evapConfig, addConfig)
      .then(function () {
        var qp = params(testRequests[t.context.testId][2].url),
            h = Object.assign({}, amzHeaders, {testId: t.context.testId, 'x-amz-date': qp.datetime}),
            r = Object.assign({}, request, {x_amz_headers: h, contentType: (addConfig ? addConfig.contentType : undefined)}),
            expected = encodeURIComponent(stringToSignV2('/' + AWS_BUCKET + '/' + t.context.config.name +
                '?partNumber=1&uploadId=Hzr2sK034dOrV4gMsYK.MMrtWIS8JVBPKgeQ.LWd6H8V2PsLecsBqoA1cG1hjD3G4KRX_EBEwxWWDu8lNKezeA--', 'PUT', r))

        return new Promise(function (resolve, reject) {
          var result = {
            result: qp.to_sign,
            expected: expected
          }
          resolve(result)

        })
      })

}
function testV2ListParts(t, request, amzHeaders, addConfig, maxGetParts, partNumberMarker, evapConfig) {
  t.context.partNumberMarker = partNumberMarker
  t.context.maxGetParts = maxGetParts

  addConfig = Object.assign({}, {file: new File({
        path: '/tmp/file',
        size: 29690176,
        name: 'tests'
      })}, addConfig)
  return testV2Authorization(t, evapConfig, addConfig)
      .then(function () {
        partNumberMarker = 0
        t.context.originalUploadObjectKey = t.context.requestedAwsObjectKey
        t.context.requestedAwsObjectKey = randomAwsKey()
        let reUpload = Object.assign({}, addConfig, {name: t.context.requestedAwsObjectKey});
        return evaporateAdd(t, t.context.evaporate, reUpload)
      })
      .then(function () {
        var qp = params(testRequests[t.context.testId][18].url),
            h = Object.assign({}, amzHeaders, {testId: t.context.testId, 'x-amz-date': qp.datetime}),
            r = Object.assign({}, request, {x_amz_headers: h}),
            expected = encodeURIComponent(stringToSignV2('/' + AWS_BUCKET + '/' + t.context.originalUploadObjectKey +
                '?uploadId=Hzr2sK034dOrV4gMsYK.MMrtWIS8JVBPKgeQ.LWd6H8V2PsLecsBqoA1cG1hjD3G4KRX_EBEwxWWDu8lNKezeA--', 'GET', r))

        return new Promise(function (resolve) {
          var result = {
            result: qp.to_sign,
            expected: expected
          }
          resolve(result)

        })
      })
}
function testV4ListParts(t, addConfig, maxGetParts, partNumberMarker, evapConfig) {
  t.context.partNumberMarker = partNumberMarker
  t.context.maxGetParts = maxGetParts

  addConfig = Object.assign({}, {file: new File({
    path: '/tmp/file',
    size: 29690176,
    name: 'tests'
  })}, addConfig)
  return testV4Authorization(t, evapConfig, addConfig)
      .then(function () {
        partNumberMarker = 0
        t.context.originalUploadObjectKey = t.context.requestedAwsObjectKey
        t.context.requestedAwsObjectKey = randomAwsKey()
        let reUpload = Object.assign({}, addConfig, {name: t.context.requestedAwsObjectKey});
        return evaporateAdd(t, t.context.evaporate, reUpload)
      })
      .then(function () {
        return new Promise(function (resolve) {
          var qp = params(testRequests[t.context.testId][18].url)

          var result =  {
            result: qp.to_sign,
            datetime: qp.datetime
          }

          resolve(result)
        })
      })
}

function stringToSignV2(path, method, request) {

  var x_amz_headers = '', result, header_key_array = [];

  for (var key in request.x_amz_headers) {
    if (request.x_amz_headers.hasOwnProperty(key)) {
      header_key_array.push(key);
    }
  }
  header_key_array.sort();

  header_key_array.forEach(function (header_key) {
    x_amz_headers += (header_key + ':' + request.x_amz_headers[header_key] + '\n');
  });

  result = method + '\n' +
      (request.md5_digest || '') + '\n' +
      (request.contentType || '') + '\n' +
      '\n' +
      x_amz_headers +
      '' +
      path;

  return result;
}

function v4Authorization(signingKey) {
  return 'AWS4-HMAC-SHA256 Credential=testkey/' + v4DateString() + '/us-east-1/s3/aws4_request, SignedHeaders=host;testid;x-amz-date, Signature=' + signingKey
}
function v4DateString() {
  return new Date().toISOString().slice(0, 10).replace(/-|:/g, '')
}
function testV4Authorization(t, initConfig, addCfg) {
  const config = {
    signerUrl: 'http://what.ever/signv4',
    awsSignatureVersion: '4',
    computeContentMd5: true,
    cryptoMd5Method: function () { return 'MD5Value'; },
    cryptoHexEncodedHash256: function (data) { return data; }
  }
  const evapConfig = Object.assign({}, config, initConfig)

  return testCommonAuthorization(t, addCfg, evapConfig);
}
function testV4ToSign(t, addConfig) {
  return testV4Authorization(t, {cryptoHexEncodedHash256: function (d) { return d; }}, addConfig)
      .then(function () {
        return new Promise(function (resolve) {
          var qp = params(testRequests[t.context.testId][2].url)

          var result =  {
            result: qp.to_sign,
            datetime: qp.datetime
          }

          resolve(result)
        })
      })
}

function params(url) {
  var query = url.split("?"),
      qs = query[1] || '',
      pairs = qs.split("&"),
      result = {};
  pairs.forEach(function (r) {
    var pr = r.split("=");