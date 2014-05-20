'use strict';

var _ = require('lodash');
var async = require('async');
var unescape = require('querystring').unescape;
var url = require('url');

var s3Resource = require('./S3Resource');

function S3Directory (location, s3, versions) {
  this.location = url.parse(location, true);
  this.s3 = s3;
  this.versions = versions || {};
  this.debug = require('debug')('docker-image-builder:S3Directory:' +
    url.format(this.location));
}

S3Directory.prototype.get = function (callback) {
  var self = this;
  self.debug('downloading directory');
  async.waterfall([
    this.listObjects.bind(this),
    this.getObjects.bind(this),
  ], function (err, results) {
    self.debug('done downloading directory.');
    callback(err, results);
  });
};

S3Directory.prototype.getTask = function () {
  return this.get.bind(this);
};

S3Directory.prototype.listObjects = function (callback) {
  var self = this;
  var IsTruncated = true;
  var NextMarker = false;
  var allData = [];
  var lastData = [];

  function isTruncated () { return IsTruncated; }
  function downloadObjectList (callback) {
    var req = {
      Bucket: unescape(self.location.hostname),
      Prefix: unescape(self.location.pathname.substring(1))
    };
    if (NextMarker) req.Marker = NextMarker;
    self.s3.listObjects(req, function (err, data) {
      if (err) return callback(err);
      IsTruncated = data.IsTruncated;
      NextMarker = IsTruncated ? _.last(data.Contents).Key : false;
      allData.push.apply(allData, data.Contents);
      delete data.Contents;
      lastData = data;
      callback();
    });
  }
  function combineAllData (err) {
    if (err) return callback(err);
    self.debug('got all the objects', allData.length);
    lastData.Contents = allData;
    callback(null, lastData);
  }

  async.whilst(
    isTruncated,
    downloadObjectList,
    combineAllData
  );
};

S3Directory.prototype.listObjectsTask = function () {
  return this.listObjects.bind(this);
};

S3Directory.prototype.getObjects = function (objectList, callback) {
  var self = this;
  var files = {};
  var prefixLength = objectList.Prefix.length - 1;
  _.each(objectList.Contents, function (entry) {
    var location = _.clone(self.location);
    location.pathname = entry.Key;
    if (self.versions[entry.Key.substring(prefixLength)]) {
      location.query = {
        version: self.versions[entry.Key.substring(prefixLength)]
      };
    }
    location = url.format(location);
    files[entry.Key.substring(prefixLength)] =
      new s3Resource(location, self.s3).getTask();
  });
  async.parallel(files, callback);
};

S3Directory.prototype.getObjectsTask = function () {
  return this.getObjects.bind(this);
};

module.exports = S3Directory;
