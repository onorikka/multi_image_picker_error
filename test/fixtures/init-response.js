module.exports = function (bucket = 'bucket', key = 'test.txt') {
  return `
    <?xml version="1.0" encoding="UTF-8"?>
    <InitiateMultipartUploadResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      <Bucket>${buc