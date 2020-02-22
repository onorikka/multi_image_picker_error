
# Evaporate

**A Complete File Upload API for AWS S3**

Evaporate is a JS library for uploading files from a browser to
AWS S3, using parallel S3's multipart uploads with MD5 checksum support
and control over pausing / resuming the upload.

[![Build Status](https://travis-ci.org/bikeath1337/EvaporateJS.svg?branch=master)](https://travis-ci.org/bikeath1337/EvaporateJS)
[![Code Climate](https://codeclimate.com/github/TTLabs/EvaporateJS/badges/gpa.svg)](https://codeclimate.com/github/TTLabs/EvaporateJS)

**Table of Contents**

- [Help us test our v3!](#help-us-test-our-v3)
- [Features](#features)
  - [Configurable](#configurable)
  - [Resilient](#resilient)
  - [Performant](#performant)
  - [Monitorable](#monitorable)
  - [Cross Platform](#cross-platform)
- [Installation](#installation)
- [API & Usage](#api--usage)
- [Authors](#authors)
- [Maintainers](#maintainers)
- [Contributing](#contributing)
- [License](#license)

## Help us test our v3!

We're in the final stages of migrating the library to Typescript and Webpack, and we're doing it to increase the maintainability of the project, but we also had reports of increased performance and lower memory usage!

The new version will foster an increase in the ease of contributing and onboarding of new maintainers.

But don't worry, as there were no contract changes, if you're using our `v2` it should work out of the box.

To test it, it's very simple, you just have to install the library like this:

```bash
npm install evaporate@TTLabs/EvaporateJS#pull/448/head
```

And that's it! It should immediately work. If you have some feedback about it, please [post it here](https://github.com/TTLabs/EvaporateJS/pull/448).

## Features

### Configurable

- Configurable number of parallel uploads for each part (`maxConcurrentParts`)

- Configurable MD5 Checksum calculations and handling for each uploaded
  part (`computeContentMd5`)

- Pluggable signing methods with `customAuthMethod` to support AWS Lambda, async functions and more.

### Resilient

- S3 Transfer Acceleration (`s3Acceleration`)

- Robust recovery when uploading huge files. Only parts that
  have not been fully uploaded again. (`s3FileCacheHoursAgo`, `allowS3ExistenceOptimization`)

- Ability to pause and resume downloads at will

- Signing methods can respond to 401 and 403 response statuses and not trigger the automatic retry feature.

- AWS Signature Version 2 and 4 (`awsSignatureVersion`)

### Performant

- Reduced memory footprint when calculating MD5 digests.

- Parallel file uploads while respecting `maxConcurrentParts`.

- If Evaporate reuses an interrupted upload or avoids uploading a file that is already available on S3, the new
  callback `nameChanged` will be invoked with the previous object name at the earliest moment. This indicates
  that requested object name was not used.

### Monitorable

- The `progress()` and `complete()` callbacks provide upload stats like transfer rate and time remaining.
