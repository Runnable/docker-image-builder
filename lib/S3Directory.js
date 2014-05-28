'use strict';

var _ = require('lodash');
var async = require('async');
var unescape = require('querystring').unescape;
var url = require('url');

var s3Resource = require('./S3Resource');

function S3Directory (location, s3, versions) {
  this.location = url.parse(location, true);
  this.s3 = s3;
  this.versions = versions || null;
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
  if (this.versions) {
    return callback(null, null);
  }

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
  if (objectList === null) {
    _.each(self.versions, function (versionId, key) {
      files[key] = createTask(key, versionId);
    });
  } else {
    _.each(objectList.Contents, function (entry) {
      files[entry.Key] = createTask(entry.Key);
    });
  }
  async.parallel(files, callback);

  function createTask (key, versionId) {
    var location = _.clone(self.location);
    location.pathname = key;
    if (versionId) {
      location.query = { version: versionId };
    }
    location = url.format(location);
    return new s3Resource(location, self.s3).getTask();
  }
};

S3Directory.prototype.getObjectsTask = function () {
  return this.getObjects.bind(this);
};

module.exports = S3Directory;
