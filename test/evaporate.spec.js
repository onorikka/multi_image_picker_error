
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
test('#create evaporate should support #pause', (t) => {
  return Evaporate.create(baseConfig)
      .then(function (evaporate) {
            expect(evaporate.pause).to.be.instanceof(Function)
          },
          function (reason) {
            t.fail(reason)
          })

})
test('#create evaporate should support #resume', (t) => {
  return Evaporate.create(baseConfig)
      .then(function (evaporate) {
            expect(evaporate.resume).to.be.instanceof(Function)
          },
          function (reason) {
            t.fail(reason)
          })

})
test('#create evaporate should support #forceRetry', (t) => {
  return Evaporate.create(baseConfig)
      .then(function (evaporate) {
            expect(evaporate.forceRetry).to.be.instanceof(Function)
          },
          function (reason) {
            t.fail(reason)
          })

})

// local time offset
test('#create evaporate should use default local time offset without a timeUrl', (t) => {
  return Evaporate.create(baseConfig)
      .then(function (evaporate) {
            expect(evaporate.localTimeOffset).to.equal(0)
          },
          function (reason) {
            t.fail(reason)
          })

})
test('#create evaporate should respect localTimeOffset', (t) => {
  var offset = 30,
      config = Object.assign({}, baseConfig, { localTimeOffset: offset })
  return Evaporate.create(config)
      .then(function (evaporate) {
            expect(evaporate.localTimeOffset).to.equal(30)
          },
          function (reason) {
            t.fail(reason)
          })

})
test('#create evaporate should respect returned server time from timeUrl when local is behind server', (t) => {
  var config = Object.assign({}, baseConfig, { timeUrl: 'http://example.com/time?testId=' + t.context.testId })
  t.context.timeUrlDate = new Date(new Date().setTime(new Date().getTime() + (60 * 60 * 1000)))
  return Evaporate.create(config)
      .then(function (evaporate) {
            expect(evaporate.localTimeOffset).to.be.closeTo(+3600000, 100)
          },
          function (reason) {
            t.fail(reason)
          })

})
test('#create evaporate should respect returned server time from timeUrl when server is behind local', (t) => {
  var config = Object.assign({}, baseConfig, { timeUrl: 'http://example.com/time?testId=' + t.context.testId })
  t.context.timeUrlDate = new Date(new Date().setTime(new Date().getTime() - (60 * 60 * 1000)))
  return Evaporate.create(config)
      .then(function (evaporate) {
            expect(evaporate.localTimeOffset).to.be.closeTo(-3600000, 100)
          },
          function (reason) {
            t.fail(reason)
          })

})
test('#create evaporate calls timeUrl only once', (t) => {
  var config = Object.assign({}, baseConfig, { timeUrl: 'http://example.com/time?testId=' + t.context.testId })
  return Evaporate.create(config)
      .then(function () {
            expect(t.context.timeUrlCalled).to.equal(1)
          },
          function (reason) {
            t.fail(reason)
          })

})
test('new Evaporate() should instantiate and return default offset before timeUrl', (t) => {
  var config = Object.assign({}, baseConfig, { timeUrl: 'http://example.com/time' })
  expect(new Evaporate(config).localTimeOffset).to.equal(0)
})
test('new Evaporate() should instantiate and not call timeUrl', (t) => {
  var config = Object.assign({}, baseConfig, { timeUrl: 'http://example.com/time' })
  var evaporate =  newEvaporate(t, config);
  return evaporateAdd(t, evaporate, config)
      .then(function () {
        expect(typeof t.context.timeUrlCalled).to.equal('undefined')
      })
})
test('new Evaporate() calls timeUrl only once', (t) => {
  var config = Object.assign({}, baseConfig, { timeUrl: 'http://example.com/time?testId=' + t.context.testId })
  expect(new Evaporate(config).localTimeOffset).to.equal(0)
})

// Unsupported
test('should require configuration options on instantiation', (t) => {
  return Evaporate.create()
      .then(function () {
          t.fail('Evaporate instantiated but should not have.')
          },
          function (reason) {
            t.pass(reason)
          })

})
test('should signerUrl is required unless signResponseHandler is present', (t) => {
  return Evaporate.create({signerUrl: null, signResponseHandler: null})
      .then(function () {
            t.fail('Evaporate instantiated but should not have.')
          },
          function (reason) {
            t.pass(reason)
          })

})

test('should require an AWS bucket with a signerUrl', (t) => {
  return Evaporate.create({signerUrl: 'https://sign.com/sign'})
      .then(function () {
            t.fail('Evaporate instantiated but should not have.')
          },
          function (reason) {
            t.pass(reason)
          })

})
test('should require an AWS bucket without a signerUrl but with a signResponseHandler', (t) => {
  return Evaporate.create({signResponseHandler: function () {}})
      .then(function () {
            t.fail('Evaporate instantiated but should not have.')
          },
          function (reason) {
            t.pass(reason)
          })

})
test('should require a cryptoMd5Method if computeContentMd5 is enabled', (t) => {
  return Evaporate.create({bucket: 'asdafsa', signerUrl: 'https://sign.com/sign', computeContentMd5: true})
      .then(function () {
            t.fail('Evaporate instantiated but should not have.')
          },
          function (reason) {
            t.pass(reason)
          })

})
test('should require a cryptoHexEncodedHash256 method if computeContentMd5 is enabled with V4 signatures', (t) => {
  return Evaporate.create({
    bucket: 'asdafsa',
    signerUrl: 'https://sign.com/sign',
    computeContentMd5: true,
    awsSignatureVersion: '4',
    cryptoMd5Method: function () {}
  })
      .then(function () {
            t.fail('Evaporate instantiated but should not have.')
          },
          function (reason) {
            t.pass(reason)
          })

})
test('should require computeContentMd5 if V4 signatures enabled', (t) => {
  return Evaporate.create({bucket: 'asdafsa', signerUrl: 'https://sign.com/sign', awsSignatureVersion: '4'})
      .then(function () {
            t.fail('Evaporate instantiated but should not have.')
          },
          function (reason) {
            t.pass(reason)
          })
})

test.serial('should require browser File support', (t) => {
  global['File'] = undefined
  return Evaporate.create({bucket: 'asdafsa', signerUrl: 'https://sign.com/sign', awsSignatureVersion: '2'})
      .then(function () {
            global.File = fileObject
            t.fail('Evaporate instantiated but should not have.')
          },
          function (reason) {
            global.File = fileObject
            t.pass(reason)
          })
})
test.serial('should require browser Blob support', (t) => {
  global['Blob'] = undefined
  return Evaporate.create({bucket: 'asdafsa', signerUrl: 'https://sign.com/sign', awsSignatureVersion: '2'})
      .then(function () {
            global.Blob = blobObject
            t.fail('Evaporate instantiated but should not have.')
          },
          function (reason) {
            global.Blob = blobObject
            t.pass(reason)
          })
})
test.serial('should require browser FileReader#readAsArrayBuffer support if computeContentMd5 enabled', (t) => {
  global['FileReader'].prototype.readAsArrayBuffer = undefined
  return Evaporate.create({bucket: 'asdafsa', signerUrl: 'https://sign.com/sign', awsSignatureVersion: '2', computeContentMd5: true, cryptoMd5Method: function () {}})
      .then(function () {
            global['FileReader'].prototype.readAsArrayBuffer = arrayBuffer
            t.fail('Evaporate instantiated but should not have.')
          },
          function (reason) {
            global['FileReader'].prototype.readAsArrayBuffer = arrayBuffer
            t.pass(reason)
          })
})
test.todo('should require browser Blob slice support')
test.todo('should require browser Promise support')
test.todo('should validate readableStream and readableStreamPartMethod')

// add

test('should fail to add() when no file is present', (t) => {
  return Evaporate.create(baseConfig)
      .then(function (evaporate) {
        evaporate.add({ name: 'test' })
            .then(function () {
                  t.fail('Evaporate added a new file but should not have.')
                },
                function (reason) {
                  expect(reason).to.match(/missing file/i)
                })
      })
});
test('should fail to add() when empty config is present', (t) => {
  return Evaporate.create(baseConfig)
      .then(function (evaporate) {
        evaporate.add({})
            .then(function () {
                  t.fail('Evaporate added a new file but should not have.')
                },