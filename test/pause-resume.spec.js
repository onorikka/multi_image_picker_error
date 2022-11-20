
import { expect } from 'chai'
import sinon from 'sinon'
import test from 'ava'

// constants

let server

function testPauseResume(t) {

  const config = {
    name: t.context.requestedAwsObjectKey,
    file: new File({
      path: '/tmp/file',
      size: 12000000,
      name: randomAwsKey()
    }),
    started: sinon.spy(),
    pausing: sinon.spy(),
    paused: sinon.spy(),
    resumed: sinon.spy()
  }
  t.context.name = config.name

  return testBase(t, config, { awsSignatureVersion: '2' })
}

test.before(() => {
  sinon.xhr.supportsCORS = true
  global.XMLHttpRequest = sinon.useFakeXMLHttpRequest()
  global.window = {
    localStorage: {},
    console: console
  };

  function partRequestHandler(xhr, context)  {
    if (xhr.url.indexOf('partNumber=1') > -1) {
      if (context.pauseHandler) {
        context.pauseHandler();
      } else {
        context.pausePromise = context.pause()
            .then(function () {
              context.resumePromise = context.resume()
            })
      }
    }
    xhr.respond(200)
  }

  server = serverCommonCase(partRequestHandler)
})

test.beforeEach((t) => {
  beforeEachSetup(t)

  t.context.pause = function () {
    return t.context.evaporate.pause(t.context.pauseFileId || t.context.uploadId, {force: t.context.force})
  }