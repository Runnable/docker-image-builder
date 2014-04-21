var url = require('url');
var unescape = require('querystring').unescape;

module.exports = S3Resource;

function S3Resource (location, s3) {
  this.location = url.parse(location);
  this.s3 = s3;
  this.debug = require('debug')('docker-image-builder:S3Resource:' + url.format(this.location));
}

S3Resource.prototype.get = function (callback) {
  var self = this;
  self.debug('downloading resource...');
  var key = unescape(self.location.path.substring(1));
  var req = {
    Bucket: unescape(self.location.hostname),
    Key: key,
    ResponseContentType: 'application/json'
  };

  this.s3.getObject(req, function (err, data) {
    self.debug('resource downloaded.');
    callback(err, data);
  });
};

S3Resource.prototype.getTask = function () {
  return this.get.bind(this);
};
