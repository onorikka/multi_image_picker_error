module.exports = function (bucket = 'bucket', key = 'test.txt', totalParts = 1, partNumberMarker) {
  let head = `
  <?xml version="1.0" encoding="UTF-8"?>
  <ListPartsResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
      <Bucket>${bucket}</Bucket>
      <Key>${key}</Key>
      <UploadId>
          OdTON0ughnzEVK_MM8WO3wUC1Z8yt9iXUXB9EY4BaYh38vYFbqEz2hmbESmjiv.ChW92IVPOMvOGy5zYY