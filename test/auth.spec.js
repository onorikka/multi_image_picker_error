
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
    if (pr.length === 1) {
      result[pr[0]] = null;
    } else {
      result[pr[0]] = pr[1];
    }
  });
  return result;
}

test.before(() => {
  sinon.xhr.supportsCORS = true

  global.XMLHttpRequest = sinon.useFakeXMLHttpRequest()

  global.window = {
   localStorage: {}
  };

  server = serverCommonCase()
})

test.beforeEach((t) =>{
  beforeEachSetup(t, new File({
      path: '/tmp/file',
      size: 50,
      name: 'tests'
    })
  )

  delete t.context.cryptoMd5
  delete t.context.cryptoHexEncodedHash256

})

test('should correctly create V2 string to sign for PUT', (t) => {
  return testV2ToSign(t)
      .then(function (result) {
        expect(result.result).to.equal(result.expected)
      })
})
test('should correctly create V2 string to sign with contentType', (t) => {
  return testV2ToSign(t, {}, {}, {contentType: 'video/mp4'})
      .then(function (result) {
        expect(result.result).to.equal(result.expected)
      })
})
test('should correctly create V2 string to sign for PUT with amzHeaders', (t) => {
  return testV2ToSign(t, {}, { 'x-custom-header': 'peanuts' }, {xAmzHeadersCommon: { testId: t.context.testId, 'x-custom-header': 'peanuts' }})
      .then(function (result) {
        expect(result.result).to.equal(result.expected);
      })
})
test('should correctly create V2 string to sign for PUT with md5 digest', (t) => {
  return testV2ToSign(t, {md5_digest: 'MD5Value'}, {}, {}, {
    computeContentMd5: true,
    cryptoMd5Method: function () { return 'MD5Value'; }
    })
      .then(function (result) {
        expect(result.result).to.equal(result.expected)
      })
})

test('should correctly create V2 string to sign with part-number-marker', (t) => {
  return testV2ListParts(t, {}, {}, {}, 5, 0)
      .then(function (result) {
        expect(testRequests[t.context.testId][19].url).to.match(/part-number-marker=2/)
      })
})
test('should correctly create V2 string to sign for truncated list parts', (t) => {
  let config = {
    name: t.context.requestedAwsObjectKey,
    file: new File({