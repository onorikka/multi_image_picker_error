module.exports = function (bucket = 'bucket', key = 'test.txt') {
  return `
    <?xml version="1.0" encoding="UTF-8"?>
    <CompleteMultipartUploadResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      <Location>https://bucket.s3.amazonaws.com/${key}</Location>
      <Bucket>${bucket}</Bucket>
  