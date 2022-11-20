
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