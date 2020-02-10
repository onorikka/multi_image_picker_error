
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