
/*Copyright (c) 2016, TT Labs, Inc.
 All rights reserved.

 Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

 Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.

 Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

 Neither the name of the TT Labs, Inc. nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.*/


/***************************************************************************************************
 *                                                                                                 *
 *  version 2.1.4                                                                                  *
 *                                                                                                 *
 ***************************************************************************************************/

(function () {
  "use strict";

  var FAR_FUTURE = new Date('2060-10-22'),
      HOURS_AGO,
      PENDING = 0, EVAPORATING = 2, COMPLETE = 3, PAUSED = 4, CANCELED = 5, ERROR = 10, ABORTED = 20, PAUSING = 30,
      PAUSED_STATUSES = [PAUSED, PAUSING],
      ACTIVE_STATUSES = [PENDING, EVAPORATING, ERROR],
      ETAG_OF_0_LENGTH_BLOB = '"d41d8cd98f00b204e9800998ecf8427e"',
      PARTS_MONITOR_INTERVAL_MS = 2 * 60 * 1000,
      IMMUTABLE_OPTIONS = [
        'maxConcurrentParts',
        'logging',
        'cloudfront',
        'encodeFilename',
        'computeContentMd5',
        'allowS3ExistenceOptimization',
        'onlyRetryForSameFileName',
        'timeUrl',
        'cryptoMd5Method',
        'cryptoHexEncodedHash256',
        'awsRegion',
        'awsSignatureVersion',
        'evaporateChanged'
      ],
      S3_EXTRA_ENCODED_CHARS =  {
        33: "%21", // !
        39: "%27", // '
        40: "%28", // (
        41: "%29", // )
        42: "%2A"  // *
      },
      l;

  var Evaporate = function (config) {
    this.config = extend({
      readableStreams: false,
      readableStreamPartMethod: null,
      bucket: null,
      logging: true,
      maxConcurrentParts: 5,
      partSize: 6 * 1024 * 1024,
      retryBackoffPower: 2,
      maxRetryBackoffSecs: 300,
      progressIntervalMS: 1000,
      cloudfront: false,
      s3Acceleration: false,
      mockLocalStorage: false,
      encodeFilename: true,
      computeContentMd5: false,
      allowS3ExistenceOptimization: false,
      onlyRetryForSameFileName: false,
      timeUrl: null,
      cryptoMd5Method: null,
      cryptoHexEncodedHash256: null,
      aws_key: null,
      awsRegion: 'us-east-1',
      awsSignatureVersion: '4',
      sendCanonicalRequestToSignerUrl: false,
      s3FileCacheHoursAgo: null, // Must be a whole number of hours. Will be interpreted as negative (hours in the past).
      signParams: {},
      signHeaders: {},
      customAuthMethod: undefined,
      maxFileSize: null,
      signResponseHandler: null,
      xhrWithCredentials: false,
      // undocumented, experimental
      localTimeOffset: undefined,
      evaporateChanged: function () {},
      abortCompletionThrottlingMs: 1000
    }, config);

    if (typeof window !== 'undefined' && window.console) {
      l = window.console;
      l.d = l.log;
      l.w = window.console.warn ? l.warn : l.d;
      l.e = window.console.error ? l.error : l.d;
    }

    this._instantiationError = this.validateEvaporateOptions();
    if (typeof this._instantiationError === 'string') {
      this.supported = false;
      return;
    } else {
      delete this._instantiationError;
    }

    if (!this.config.logging) {
      // Reset the logger to be a no_op
      l = noOpLogger();
    }

    var _d = new Date();
    HOURS_AGO = new Date(_d.setHours(_d.getHours() - (this.config.s3FileCacheHoursAgo || -100)));
    if (typeof config.localTimeOffset === 'number') {
      this.localTimeOffset = config.localTimeOffset;
    } else {
      var self = this;
      Evaporate.getLocalTimeOffset(this.config)
          .then(function (offset) {
            self.localTimeOffset = offset;
          });
    }
    this.pendingFiles = {};
    this.queuedFiles = [];
    this.filesInProcess = [];
    historyCache = new HistoryCache(this.config.mockLocalStorage);
  };
  Evaporate.create = function (config) {
    var evapConfig = extend({}, config);
    return Evaporate.getLocalTimeOffset(evapConfig)
        .then(function (offset) {
          evapConfig.localTimeOffset = offset;
          return new Promise(function (resolve, reject) {
            var e = new Evaporate(evapConfig);
            if (e.supported === true) {
              resolve(e);
            } else {
              reject(e._instantiationError);
            }
          });
        });
  };
  Evaporate.getLocalTimeOffset = function (config) {