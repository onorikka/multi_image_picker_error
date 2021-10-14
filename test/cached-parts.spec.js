
import { expect } from 'chai'
import sinon from 'sinon'
import test from 'ava'

// constants

let server, storage

function testCachedParts(t, addConfig, maxGetParts, partNumberMarker, evapCfg) {
  t.context.partNumberMarker = partNumberMarker
  t.context.maxGetParts = maxGetParts