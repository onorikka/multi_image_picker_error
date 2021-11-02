
import chai, { expect } from 'chai'
import chaiSinon from 'sinon-chai'
import sinon from 'sinon'
import test from 'ava'
import Evaporate from '../evaporate'

chai.use(chaiSinon)

// consts

const baseConfig = {
  signerUrl: 'http://what.ever/sign',
  aws_key: 'testkey',
  bucket: AWS_BUCKET,
  logging: false,
  maxRetryBackoffSecs: 0.1,
  awsSignatureVersion: '2',
  abortCompletionThrottlingMs: 0
}

const baseAddConfig = {
  name: AWS_UPLOAD_KEY,
  file: new File({
    path: '/tmp/file',
    size: 50
  })
}

let server, fileObject, blobObject, arrayBuffer

function testCommon(t, addConfig, initConfig) {
  let evapConfig = Object.assign({}, {awsSignatureVersion: '2'}, initConfig)
  return testBase(t, addConfig, evapConfig)
}

function testCancelCallbacks(t) {
  const evapConfig = Object.assign({}, baseConfig, {
    evaporateChanged: sinon.spy()
  })
  const config = Object.assign({}, baseAddConfig, {
    name: randomAwsKey(),
    cancelled: sinon.spy(),
    started: function (fileId) { id = fileId; }
  })

  let id

  return testCommon(t, config, evapConfig)
      .then(function () {
        return t.context.evaporate.cancel(id)
      })
}


test.before(() => {
  sinon.xhr.supportsCORS = true
  global.XMLHttpRequest = sinon.useFakeXMLHttpRequest()
  server = serverCommonCase()
  fileObject = global.File
  blobObject = global.Blob
  arrayBuffer = global.FileReader.prototype.readAsArrayBuffer
})

test.beforeEach((t) =>{
  beforeEachSetup(t, new File({
    path: '/tmp/file',
    size: 50,
    name: randomAwsKey()
  }))
})

test('should work', (t) => {
  expect(true).to.be.ok
})

// constructor

test('#create should return supported instance', (t) => {
  return Evaporate.create(baseConfig)
      .then(function (evaporate) {
        expect(evaporate).to.be.instanceof(Evaporate)
      },
      function (reason) {
        t.fail(reason)
      })
})
test('#create evaporate should support #add', (t) => {
  return Evaporate.create(baseConfig)
      .then(function (evaporate) {
            expect(evaporate.add).to.be.instanceof(Function)
          },
          function (reason) {
            t.fail(reason)
          })

})
test('#create evaporate should support #cancel', (t) => {
  return Evaporate.create(baseConfig)
      .then(function (evaporate) {
            expect(evaporate.cancel).to.be.instanceof(Function)
          },
          function (reason) {
            t.fail(reason)
          })

})