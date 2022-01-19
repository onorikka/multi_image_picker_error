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
  ma