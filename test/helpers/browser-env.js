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
globa