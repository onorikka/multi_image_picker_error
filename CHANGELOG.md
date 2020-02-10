
# v2.1.4

## Bug Fixes ##
- Issue #377. Sends Content-Type header for all request types to address
  compatibility issue with Microsoft Edge.

# v2.1.3

## Bug Fixes ##
- Issue #375. Encodes asterisk (*) in file names to fix signature
  mismatches.

# v2.1.2

## Bug Fixes ##
- Issue #355. Addresses memory retention issue that arose in a recent Chrome update.
  Chrome was keeping a reference to the Xhr object in a system array because
  EvaporateJS was passing an XHR reference as a parameter to Promise.resolve().

# v2.1.1

## Enhancements ##
- PR #357. The progress callback response now includes more stats

## Bug Fixes ##
- Issue #356. Filenames containing "!" are now correctly encoded for S3 so that
  signatures match

# v2.1.0

## Enhancements ##
- the example html now allows the aws_key to be changed
- Improved examples for node.js

## Bug Fixes ##
- Issues #340. Resolved memory retention issue when using V2 signatures without `computeContentMd5`.

# v2.0.9

## Enhancements ##
- Issue #333. The sample page `example/evaporate_example.html` now allows
  AWS conifguration options to be temporarily stored on the page and provides
  a `customAuthMethod` backed by JavaScript. This should make it easier to
  test EvaporateJS with specific AWS settings.
- Issue #309, #312, #314. Allows AWS_URL and AWS_KEY to be overridden when a file
  is added for upload.
- Issue #320. Adds an optional localCache polyfill if localStorage is not
  available. Must be explicitly enabled with `mockLocalStorage`.
- Issue #329. A contributor provided a signing example for PHP.Laraval.

## Bug Fixes ##
- Issues #316, #325. Restores Microsoft Windows compatibilty with Edge and Google
  Chrome that broken when Evaporate started to parse URLs using the URL
  object and incorrectly use the unsupported `Object.assign` method.

# v2.0.8

## Bug Fixes ##
- Issue #300. Restores compatibility with Windows 11 by removing refernces
  to Object.assign

# v2.0.7

## Enhancements ##
- Issue #300. Signer methods and urls paramaters now enable the AWS signing
  version 4 canonical request to be passed.
- Issue #305. Adds new callback `uploadInitiated` that returns the S3 upload ID.

# v2.0.6

## Enhancements ##
- Issue #290. Improved python example for V4 signatures.

## Bug Fixes ##
- Issue #292. Corrects an issue where the override options on Evaporate#add were not properly
  applied.

# v2.0.5

## Enhancements ##
- Issue #199. Adds support for multipart uploads using Node FileSytem (fs) ReadableStreams.
  This enables intregration with Electron to upload files outside of a browser framework.

# v2.0.4

## Bug Fixes ##
- Issue #284. Memory was being retained during an upload but released on completion. Memory
  is properly managed now.

# v2.0.3

Note: tagged branch 1.6.4 is available with this fix for 1.x users. To install,

```shell
npm install git://github.com/TTLabs/EvaporateJS.git#1.6.4
```

## Bug Fixes ##
- Correctly encodes all single quotes in an S3 object name. Issue #264 (revisited)
- Simplifies internal 'casting' of ArrayBuffer to Uint8Array (ArrayBufferView)

# v2.0.2

## Enhancements ##
- Optimizes size of last part, making sure it's not reporting longer than it actually is
- Improves memory reuse of large parts
- Lazily calls getPayload for V4 signatures, not at instantiation
- Adds a sample Python signing routine for V4 signatures
- Adds recipes for using node.js `crypto` with Evaporate

# v2.0.1

## Bug Fixes ##
- Issue #277. It was possible for a queued file to not start if the previous file was canceled
  before it had started. Also addressed edge cases and race conditions when canceling a list
  of files that have been submitted. Thanks to @cvn for the test cases.

# v2.0.0

## New Features ##
- Adds upload stats to .progress and .complete callbacks. Stats include transfer rate
  in bytes/second, friendly formatted rate (Kbs, Mbs, etc.) and expected seconds to finish.
- Adds new callback "nameChanged" called when the requested S3 object key
  was not used because an interrupted upload was resumed or a previously
  uploaded object was used instead.
- Adds signing example for Go.

## Enhancements ##
- File processing is now distributed. Previously, Evaporate would upload
  one file at a time. If you uploaded 5 files, each with a total size
  less than the part size, that unused "slots" would go unused. This
  version will distribute unused slots to the next file to upload, meaning
  that Evaporate can upload several files simultaneously, up to the value
  of `maxConcurrentParts`. In other words, if `maxConcurrentParts` is 6,
  and you want to upload many files whose size is less then the part size,
  then evaporate will upload 6 files conconcurrently with each file using
  one upload "slot". Evaporate will ensure that no more than
  `maxConcurrentParts` are in play at any one time.
- Enhances Evaporate#cancel to cancel all uploads
- Documents the `beforeSigner` option for a file upload.

## Breaking Changes ##
- Evaporate now requires support for ES6 Promises. Use a polyfill for browsers that that don't support them.
- The default Signature style is now V4 (V2 signature users must set `awsSignatureVersion` explicitly)
- Instantiate Evaporate using its create class method.
- Evaporate#add no longer returns a numeric id referencing the file upload. It now
  returns a Promise when adding a file to upload. To act on the file upload, for
  example, to Pause, Resume or Cancel, use a composed key consisting of the
  bucket and object name. Refer to the README for for more information.
- Evaporate#cancel, Evaporate#pause and #Evaporate#resume now return promises
  that resolve when the action is complete, or reject with a reason.
- Makes authorization (signing) a pluggable feature and as a result, removes
  built-in support for AWS Lambda. Consequently, async methods can be used
  to calculate a signature. The custom authorization method must return
  a Promise and is specified through the `customAuthMethod` option. The
  README includes examples of how to define authorization through
  AWSLambda, as do the examples.
- Allows the upload to be aborted if the signature url responds with
  401 or 403. Additionally, if the customAuthMethod promise rejects,
  then the upload is aborted.
- `signReponseHandler` now must return a Promise. It is now only used to
  post-process a response from `signUrl`.

## Bug Fixes ##
- Evaporate was not fetching all uploaded parts from S3 if the file had
  more then 1,000 parts.

# v1.6.3#