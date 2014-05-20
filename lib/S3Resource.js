'use strict';

var url = require('url');
var unescape = require('querystring').unescape;

function S3Resource (location, s3) {
  this.location = url.parse(location, true);
  this.s3 = s3;
  this.debug = require('debug')('docker-image-builder:S3Resource:' +
    url.format(this.location));
}

S3Resource.prototype.get = function (callback) {
  var self = this;
  self.debug('downloading resource...');
  var key = unescape(self.location.pathname.substring(1));
  var req = {
    Bucket: unescape(self.location.hostname),
    Key: key,
    ResponseContentType: 'application/json'
  };
  if (self.location.query.version) {
    req.VersionId = unescape(self.location.query.version);
  }

  this.s3.getObject(req, function (err, data) {
    if (err) {
      return callback(err);
    }
    self.debug('resource downloaded.');
    callback(null, data);
  });
};

S3Resource.prototype.getTask = function () {
  return this.get.bind(this);
};

module.exports = S3Resource;
