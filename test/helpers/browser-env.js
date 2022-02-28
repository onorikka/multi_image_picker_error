import { DOMParser } from 'xmldom'
import { jsdom } from 'jsdom'
import { File } from 'file-api'
import Evaporate from '../../evaporate'
import sinon from 'sinon'
import initResponse from '../fixtures/init-response'
import completeResponse from '../fixtures/complete-response'
import getPartsResponse from '../fixtures/get-parts-truncated-response'

const CONTENT_TYPE_XML = { 'Content-Type': 'text/xml' }
const CONTENT_TYPE_TEXT = { 'Content-Type': 'text/plain' }

const AWS_UPLOAD_KEY = 'tests'

global.document = jsdom('<body></body>')
global.DOMParser = DOMParser

File.prototype.slice = function (start = 0, end = null, contentType = '') {
  if (!end) {
    end = this.size
  }
  return new File({
    size: end - start,
    path: this.path,
    name: this.name,
    type: this.type || contentType
  })
}

global.File = File
global.Blob = File

let FileReaderMock = function () {}
FileReaderMock.prototype.onloadend = function () {}
FileReaderMock.prototype.readAsArrayBuffer = function () { this.onloadend(); }

global.FileReader = FileReaderMock;

global.AWS_BUCKET = 'bucket'
global.AWS_UPLOAD_KEY = 'tests'

const baseConfig = {
  signerUrl: 'http://what.ever/sign',
  aws_key: 'testkey',
  bucket: AWS_BUCKET,
  logging: false,
  maxRetryBackoffSecs: 0.1,
  abortCompletionThrottlingMs: 0
}

function LocalStorage() {
  this.cache = {};
  this.getItem = function (key) {
    return this.cache[key];
  };
  this.setItem = function (key, value) {
    return this.cache[key] = value;
  };
  this.removeItem = function (key) {
    delete this.cache[key];
  };
}

global.localStorage = new LocalStorage();

global.testRequests = {}
global.testContext = {}

global.randomAwsKey = function () {
  return Math.random().toString().substr(2) + '_' + AWS_UPLOAD_KEY
}

let requestMap = {
  'POST:uploads': 'initiate',
  'POST:uploadId': 'complete',
  'DELETE:uploadId': 'cancel',
  'GET:uploadId': 'check for parts'
}

global.requestOrder = function (t) {
  var result = []
  let r = testRequests[t.context.testId]
  r.forEach(function (r) {
    // Ignore the signing requests
    if (!r.url.match(/\/sign.*$/)) {
      var x = r.url.split('?'),
          y = x[1] ? x[1].split('&') : '',
          z = y[0] ? y[0].split('=')[0] : y
      if (z === 'partNumber') {
        z += '='
        z += y[0].split('=')[1]
      }

      var v = z ? r.method + ':' + z : r.method
      result.push(requestMap[v] || v)
    }
  })

  return result.join(',')
}

global.headersForMethod = function(t, method, urlRegex) {
  var r = urlRegex || /./
  let requests = testRequests[t.context.testId]
  for (var i = 0; i < requests.length; i++) {
    var xhr = requests[i]
    if (x