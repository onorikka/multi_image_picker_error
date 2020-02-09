
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