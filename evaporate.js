
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
    return new Promise(function (resolve, reject) {
      if (typeof config.localTimeOffset === 'number') {
        return resolve(config.localTimeOffset);
      }
      if (config.timeUrl) {
        var xhr = new XMLHttpRequest();

        xhr.open("GET", config.timeUrl + '?requestTime=' + new Date().getTime());
        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              var server_date = new Date(Date.parse(xhr.responseText)),
                  offset = server_date - new Date();
              l.d('localTimeOffset is', offset, 'ms');
              resolve(offset);
            }
          }
        };

        xhr.onerror = function (xhr) {
          l.e('xhr error timeUrl', xhr);
          reject('Fetching offset time failed with status: ' + xhr.status);
        };
        xhr.send();
      } else {
        resolve(0);
      }
    });
  };
  Evaporate.prototype.config = {};
  Evaporate.prototype.localTimeOffset = 0;
  Evaporate.prototype.supported = false;
  Evaporate.prototype._instantiationError = undefined;
  Evaporate.prototype.evaporatingCount = 0;
  Evaporate.prototype.pendingFiles = {};
  Evaporate.prototype.filesInProcess = [];
  Evaporate.prototype.queuedFiles = [];
  Evaporate.prototype.startNextFile = function (reason) {
    if (!this.queuedFiles.length ||
        this.evaporatingCount >= this.config.maxConcurrentParts) { return; }
    var fileUpload = this.queuedFiles.shift();
    if (fileUpload.status === PENDING) {
      l.d('Starting', decodeURIComponent(fileUpload.name), 'reason:', reason);
      this.evaporatingCnt(+1);
      fileUpload.start();
    } else {
      // Add the file back to the stack, it's not ready
      l.d('Requeued', decodeURIComponent(fileUpload.name), 'status:', fileUpload.status, 'reason:', reason);
      this.queuedFiles.push(fileUpload);
    }
  };
  Evaporate.prototype.fileCleanup = function (fileUpload) {
    removeAtIndex(this.queuedFiles, fileUpload);
    if (removeAtIndex(this.filesInProcess, fileUpload)) {
      this.evaporatingCnt(-1);
    }
    fileUpload.done();
    this.consumeRemainingSlots();
  };
  Evaporate.prototype.queueFile = function (fileUpload) {
    this.filesInProcess.push(fileUpload);
    this.queuedFiles.push(fileUpload);
    if (this.filesInProcess.length === 1) {
      this.startNextFile('first file');
    }
  };
  Evaporate.prototype.add = function (file,  pConfig) {
    var self = this,
        fileConfig;
    return new Promise(function (resolve, reject) {
      var c = extend(pConfig, {});

      IMMUTABLE_OPTIONS.forEach(function (a) { delete c[a]; });

      fileConfig = extend(self.config, c);

      if (typeof file === 'undefined' || typeof file.file === 'undefined') {
        return reject('Missing file');
      }
      if (fileConfig.maxFileSize && file.file.size > fileConfig.maxFileSize) {
        return reject('File size too large. Maximum size allowed is ' + readableFileSize(fileConfig.maxFileSize));
      }
      if (typeof file.name === 'undefined') {
        return reject('Missing attribute: name');
      }

      if (fileConfig.encodeFilename) {
        // correctly encode to an S3 object name, considering '/' and ' '
        file.name = s3EncodedObjectName(file.name);
      }

      var fileUpload = new FileUpload(extend({
            started: function () {},
            uploadInitiated: function () {},
            progress: function () {},
            complete: function () {},
            cancelled: function () {},
            paused: function () {},
            resumed: function () {},
            pausing: function () {},
            nameChanged: function () {},
            info: function () {},
            warn: function () {},
            error: function () {},
            beforeSigner: undefined,
            xAmzHeadersAtInitiate: {},
            notSignedHeadersAtInitiate: {},
            xAmzHeadersCommon: null,
            xAmzHeadersAtUpload: {},
            xAmzHeadersAtComplete: {}
          }, file, {
            status: PENDING,
            priority: 0,
            loadedBytes: 0,
            sizeBytes: file.file.size,
            eTag: ''
          }), fileConfig, self),
          fileKey = fileUpload.id;

      self.pendingFiles[fileKey] = fileUpload;

      self.queueFile(fileUpload);

      // Resolve or reject the Add promise based on how the fileUpload completes
      fileUpload.deferredCompletion.promise
          .then(
              function () {
                self.fileCleanup(fileUpload);
                resolve(decodeURIComponent(fileUpload.name));
              },
              function (reason) {
                self.fileCleanup(fileUpload);
                reject(reason);
              }
          );
    })
  };
  Evaporate.prototype.cancel = function (id) {
    return typeof id === 'undefined' ? this._cancelAll() : this._cancelOne(id);
  };
  Evaporate.prototype._cancelAll = function () {
    l.d('Canceling all file uploads');
    var promises = [];
    for (var key in this.pendingFiles) {
      if (this.pendingFiles.hasOwnProperty(key)) {
        var file = this.pendingFiles[key];
        if (ACTIVE_STATUSES.indexOf(file.status) > -1) {
          promises.push(file.stop());
        }
      }
    }
    if (!promises.length) {
      promises.push(Promise.reject('No files to cancel.'));
    }
    return Promise.all(promises);
  };
  Evaporate.prototype._cancelOne = function (id) {
    var promise = [];
    if (this.pendingFiles[id]) {
      promise.push(this.pendingFiles[id].stop());
    } else {
      promise.push(Promise.reject('File does not exist'));
    }
    return Promise.all(promise);
  };
  Evaporate.prototype.pause = function (id, options) {
    options = options || {};
    var force = typeof options.force === 'undefined' ? false : options.force;
    return typeof id === 'undefined' ? this._pauseAll(force) : this._pauseOne(id, force);
  };
  Evaporate.prototype._pauseAll = function (force) {
    l.d('Pausing all file uploads');
    var promises = [];
    for (var key in this.pendingFiles) {
      if (this.pendingFiles.hasOwnProperty(key)) {
        var file = this.pendingFiles[key];
        if (ACTIVE_STATUSES.indexOf(file.status) > -1) {
          this._pause(file, force, promises);
        }
      }
    }
    return Promise.all(promises);
  };
  Evaporate.prototype._pauseOne = function (id, force) {
    var promises = [],
        file = this.pendingFiles[id];
    if (typeof file === 'undefined') {
      promises.push(Promise.reject('Cannot pause a file that has not been added.'));
    } else if (file.status === PAUSED) {
      promises.push(Promise.reject('Cannot pause a file that is already paused.'));
    }
    if (!promises.length) {
      this._pause(file, force, promises);
    }
    return Promise.all(promises);
  };
  Evaporate.prototype._pause = function(fileUpload, force, promises) {
    promises.push(fileUpload.pause(force));
    removeAtIndex(this.filesInProcess, fileUpload);
    removeAtIndex(this.queuedFiles, fileUpload);
  };
  Evaporate.prototype.resume = function (id) {
    return typeof id === 'undefined' ? this._resumeAll() : this._resumeOne(id);
  };
  Evaporate.prototype._resumeAll = function () {
    l.d('Resuming all file uploads');
    for (var key in this.pendingFiles) {
      if (this.pendingFiles.hasOwnProperty(key)) {
        var file = this.pendingFiles[key];
        if (PAUSED_STATUSES.indexOf(file.status) > -1)  {
          this.resumeFile(file);
        }
      }
    }
    return Promise.resolve();
  };
  Evaporate.prototype._resumeOne = function (id) {
    var file = this.pendingFiles[id],
        promises = [];
    if (typeof file === 'undefined') {
      promises.push(Promise.reject('Cannot pause a file that does not exist.'));
    } else if (PAUSED_STATUSES.indexOf(file.status) === -1) {
      promises.push(Promise.reject('Cannot resume a file that has not been paused.'));
    } else {
      this.resumeFile(file);
    }
    return Promise.all(promises);
  };
  Evaporate.prototype.resumeFile = function (fileUpload) {
    fileUpload.resume();
    this.queueFile(fileUpload);
  };
  Evaporate.prototype.forceRetry = function () {};
  Evaporate.prototype.consumeRemainingSlots = function () {
    var avail = this.config.maxConcurrentParts - this.evaporatingCount;
    if (!avail) { return; }
    for (var i = 0; i < this.filesInProcess.length; i++) {
      var file = this.filesInProcess[i];
      var consumed = file.consumeSlots();
      if (consumed < 0) { continue; }
      avail -= consumed;
      if (!avail) { return; }
    }
  };
  Evaporate.prototype.validateEvaporateOptions = function () {
    this.supported = !(
    typeof File === 'undefined' ||
    typeof Promise === 'undefined');

    if (!this.supported) {
      return 'Evaporate requires support for File and Promise';
    }

    if (this.config.readableStreams) {
      if (typeof this.config.readableStreamPartMethod !== 'function') {
        return "Option readableStreamPartMethod is required when readableStreams is set."
      }
    } else  {
      if (typeof Blob === 'undefined' || typeof (
          Blob.prototype.webkitSlice ||
          Blob.prototype.mozSlice ||
          Blob.prototype.slice) === 'undefined') {
        return 'Evaporate requires support for Blob [webkitSlice || mozSlice || slice]';
      }
    }

    if (!this.config.signerUrl && typeof this.config.customAuthMethod !== 'function') {
      return "Option signerUrl is required unless customAuthMethod is present.";
    }

    if (!this.config.bucket) {
      return "The AWS 'bucket' option must be present.";
    }

    if (this.config.computeContentMd5) {
      this.supported = typeof FileReader.prototype.readAsArrayBuffer !== 'undefined';
      if (!this.supported) {
        return 'The browser\'s FileReader object does not support readAsArrayBuffer';
      }

      if (typeof this.config.cryptoMd5Method !== 'function') {
        return 'Option computeContentMd5 has been set but cryptoMd5Method is not defined.'
      }

      if (this.config.awsSignatureVersion === '4') {
        if (typeof this.config.cryptoHexEncodedHash256 !== 'function') {
          return 'Option awsSignatureVersion is 4 but cryptoHexEncodedHash256 is not defined.';
        }
      }
    } else if (this.config.awsSignatureVersion === '4') {
      return 'Option awsSignatureVersion is 4 but computeContentMd5 is not enabled.';
    }
    return true;
  };
  Evaporate.prototype.evaporatingCnt = function (incr) {
    this.evaporatingCount = Math.max(0, this.evaporatingCount + incr);
    this.config.evaporateChanged(this, this.evaporatingCount);
  };


  function FileUpload(file, con, evaporate) {
    this.fileTotalBytesUploaded = 0;
    this.s3Parts = [];
    this.partsOnS3 = [];
    this.partsInProcess = [];
    this.partsToUpload = [];
    this.numParts = -1;
    this.con = extend({}, con);
    this.evaporate = evaporate;
    this.localTimeOffset = evaporate.localTimeOffset;
    this.deferredCompletion = defer();

    extend(this, file);

    this.id = decodeURIComponent(this.con.bucket + '/' + this.name);

    this.signParams = con.signParams;
  }
  FileUpload.prototype.con = undefined;
  FileUpload.prototype.evaporate = undefined;
  FileUpload.prototype.localTimeOffset = 0;
  FileUpload.prototype.id = undefined;
  FileUpload.prototype.status = PENDING;
  FileUpload.prototype.numParts = -1;
  FileUpload.prototype.fileTotalBytesUploaded = 0;
  FileUpload.prototype.partsInProcess = [];
  FileUpload.prototype.partsToUpload = [];
  FileUpload.prototype.s3Parts = [];
  FileUpload.prototype.partsOnS3 = [];
  FileUpload.prototype.deferredCompletion = undefined;
  FileUpload.prototype.abortedByUser = false;

  // Progress and Stats
  FileUpload.prototype.progressInterval = undefined;
  FileUpload.prototype.startTime = undefined;
  FileUpload.prototype.loaded = 0;
  FileUpload.prototype.totalUploaded = 0;
  FileUpload.prototype.updateLoaded = function (loadedNow) {
    this.loaded += loadedNow;
    this.fileTotalBytesUploaded += loadedNow;
  };
  FileUpload.prototype.progessStats = function () {
    // Adapted from https://github.com/fkjaekel
    // https://github.com/TTLabs/EvaporateJS/issues/13
    if (this.fileTotalBytesUploaded === 0) {
      return {
        speed: 0,
        readableSpeed: "",
        loaded: 0,
        totalUploaded: 0,
        remainingSize: this.sizeBytes,
        secondsLeft: -1,
        fileSize: this.sizeBytes,
      };
    }

    this.totalUploaded += this.loaded;
    var delta = (new Date() - this.startTime) / 1000,
        avgSpeed = this.totalUploaded / delta,
        remainingSize = this.sizeBytes - this.fileTotalBytesUploaded,
        stats = {
          speed: avgSpeed,
          readableSpeed: readableFileSize(avgSpeed),
          loaded: this.loaded,
          totalUploaded: this.fileTotalBytesUploaded,
          remainingSize: remainingSize,
          secondsLeft: -1,
          fileSize: this.sizeBytes,

        };

    if (avgSpeed > 0) {
      stats.secondsLeft = Math.round(remainingSize / avgSpeed);
    }

    return stats;
  };
  FileUpload.prototype.onProgress = function () {
    if ([ABORTED, PAUSED].indexOf(this.status) === -1) {
      this.progress(this.fileTotalBytesUploaded / this.sizeBytes, this.progessStats());
      this.loaded = 0;
    }
  };
  FileUpload.prototype.startMonitor = function () {
    clearInterval(this.progressInterval);
    this.startTime = new Date();
    this.loaded = 0;
    this.totalUploaded = 0;
    this.onProgress();
    this.progressInterval = setInterval(this.onProgress.bind(this), this.con.progressIntervalMS);
  };
  FileUpload.prototype.stopMonitor = function () {
    clearInterval(this.progressInterval);
  };

  // Evaporate proxies
  FileUpload.prototype.startNextFile = function (reason) {
    this.evaporate.startNextFile(reason);
  };
  FileUpload.prototype.evaporatingCnt = function (incr) {
    this.evaporate.evaporatingCnt(incr);
  };
  FileUpload.prototype.consumeRemainingSlots = function () {
    this.evaporate.consumeRemainingSlots();
  };
  FileUpload.prototype.getRemainingSlots = function () {
    var evapCount = this.evaporate.evaporatingCount;
    if (!this.partsInProcess.length && evapCount > 0) {
      // we can use our file slot
      evapCount -= 1;
    }
    return this.con.maxConcurrentParts - evapCount;
  };

  FileUpload.prototype.lastPartSatisfied = Promise.resolve('onStart');

  FileUpload.prototype.start = function () {
    this.status = EVAPORATING;
    this.startMonitor();
    this.started(this.id);

    if (this.uploadId) {
      l.d('resuming FileUpload ', this.id);
      return this.consumeSlots();
    }

    var awsKey = this.name;

    this.getUnfinishedFileUpload();

    var existenceOptimized = this.con.computeContentMd5 &&
            this.con.allowS3ExistenceOptimization &&
            typeof this.firstMd5Digest !== 'undefined' &&
            typeof this.eTag !== 'undefined';

        if (this.uploadId) {
          if (existenceOptimized) {
            return this.reuseS3Object(awsKey)
                .then(this.deferredCompletion.resolve)
                .catch(this.uploadFileFromScratch.bind(this));
          }

          this.resumeInterruptedUpload()
              .then(this._uploadComplete.bind(this))
              .catch(this.uploadFileFromScratch.bind(this));
        } else {
          this.uploadFileFromScratch("");
        }
  };
  FileUpload.prototype.uploadFileFromScratch = function (reason) {
    if (ACTIVE_STATUSES.indexOf(this.status) === -1) { return; }
    l.d(reason);
    this.uploadId = undefined;
    return this.uploadFile(this.name)
        .then(this._uploadComplete.bind(this))
        .catch(this._abortUpload.bind(this));
  };
  FileUpload.prototype._uploadComplete = function () {
    this.completeUpload().then(this.deferredCompletion.resolve);
  };
  FileUpload.prototype.stop = function () {
    l.d('stopping FileUpload ', this.id);
    this.setStatus(CANCELED);
    this.info('Canceling uploads...');
    this.abortedByUser = true;
    var self = this;
    return this.abortUpload()
        .then(function () {
          throw("User aborted the upload");
        })
        .catch(function (reason) {
          self.deferredCompletion.reject(reason);
        });
  };
  FileUpload.prototype.pause = function (force) {
    l.d('pausing FileUpload, force:', !!force, this.id);
    var promises = [];
    this.info('Pausing uploads...');
    this.status = PAUSING;
    if (force) {
      this.abortParts(true);
    } else {
      promises = this.partsInProcess.map(function (p) {
        return this.s3Parts[p].awsRequest.awsDeferred.promise
      }, this);
      this.pausing();
    }
    return Promise.all(promises)
        .then(function () {
          this.stopMonitor();
          this.status = PAUSED;
          this.startNextFile('pause');
          this.paused();
        }.bind(this));
  };
  FileUpload.prototype.resume = function () {
    this.status = PENDING;
    this.resumed();
  };
  FileUpload.prototype.done = function () {
    clearInterval(this.progressInterval);
    this.startNextFile('file done');
    this.partsOnS3 = [];
    this.s3Parts = [];
  };
  FileUpload.prototype._startCompleteUpload = function (callComplete) {
    return function () {
      var promise = callComplete ? this.completeUpload() : Promise.resolve();
      promise.then(this.deferredCompletion.resolve.bind(this));
    }
  };
  FileUpload.prototype._abortUpload = function () {
    if (!this.abortedByUser) {
      var self = this;
      this.abortUpload()
          .then(
              function () { self.deferredCompletion.reject('File upload aborted due to a part failing to upload'); },
              this.deferredCompletion.reject.bind(this));
    }
  };

  FileUpload.prototype.abortParts = function (pause) {
    var self = this;
    var toAbort = this.partsInProcess.slice(0);
    toAbort.forEach(function (i) {
      var s3Part = self.s3Parts[i];
      if (s3Part) {
        s3Part.awsRequest.abort();
        if (pause) { s3Part.status = PENDING; }
        removeAtIndex(self.partsInProcess, s3Part.partNumber);
        if (self.partsToUpload.length) { self.evaporatingCnt(-1); }
      }
    });
  };
  FileUpload.prototype.makeParts = function (firstPart) {
    this.numParts = Math.ceil(this.sizeBytes / this.con.partSize) || 1; // issue #58
    var partsDeferredPromises = [];

    var self = this;

    function cleanUpAfterPart(s3Part) {
      removeAtIndex(self.partsToUpload, s3Part.partNumber);
      removeAtIndex(self.partsInProcess, s3Part.partNumber);

      if (self.partsToUpload.length) { self.evaporatingCnt(-1); }
    }

    function resolve(s3Part) { return function () {
      cleanUpAfterPart(s3Part);
      if (self.partsToUpload.length) { self.consumeRemainingSlots(); }
      if (self.partsToUpload.length < self.con.maxConcurrentParts) {
        self.startNextFile('part resolve');
      }
    };
    }
    function reject(s3Part) { return function () {
      cleanUpAfterPart(s3Part);
    };
    }

    var limit = firstPart ? 1 : this.numParts;

    for (var part = 1; part <= limit; part++) {
      var s3Part = this.s3Parts[part];
      if (typeof s3Part !== "undefined"){
        if(s3Part.status === COMPLETE) { continue; }
      } else {
        s3Part = this.makePart(part, PENDING, this.sizeBytes);
      }
      s3Part.awsRequest = new PutPart(this, s3Part);
      s3Part.awsRequest.awsDeferred.promise
          .then(resolve(s3Part), reject(s3Part));

      this.partsToUpload.push(part);
      partsDeferredPromises.push(this.s3Parts[part].awsRequest.awsDeferred.promise);
    }

    return partsDeferredPromises;
  };
  FileUpload.prototype.makePart = function (partNumber, status, size) {
    var s3Part = {
      status: status,
      loadedBytes: 0,
      loadedBytesPrevious: null,
      isEmpty: (size === 0), // issue #58
      md5_digest: null,
      partNumber: partNumber
    };

    this.s3Parts[partNumber] = s3Part;

    return s3Part;
  };
  FileUpload.prototype.setStatus = function (s) {
    this.status = s;
  };

  FileUpload.prototype.createUploadFile = function () {
    if (this.status === ABORTED) { return; }