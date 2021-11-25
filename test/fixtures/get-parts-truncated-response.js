module.exports = function (bucket = 'bucket', key = 'test.txt', totalParts = 1, partNumberMarker) {
  let head = `
  <?xml version="1.0" encoding="UTF-8"?>
