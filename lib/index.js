'use strict';

var _ = require('lodash');
var async = require('async');
var url = require('url');
var join = require('path').join;

var s3Resource = require('./S3Resource');
var s3Directory = require('./S3Directory');
var dockerBuilder = require('./DockerBuilder');

var ImageBuilder = function (options) {
  if (!(this instanceof ImageBuilder)) {
    return new ImageBuilder(options);
  }
  this.debug = require('debug')('docker-image-builder:main');
  this.options = options || {};
  if (this.options.aws) this.aws = require('./aws')(this.options.aws);
};

ImageBuilder.prototype.run = function (callback) {
  var self = this;
  self.debug('running!');
  async.waterfall([
    this.buildTasks.bind(this),
    this.runTasks.bind(this),
    this.buildImages.bind(this)
  ], function (err, results) {
    if (err) return callback(err);
    self.debug('done running!');
    var data = {};
    results.forEach(function (result) {
      _.extend(data, result);
    });
    callback(null, data);
  });
};

ImageBuilder.prototype.buildTasks = function (callback) {
  var context = this.options.context;
  this.debug('building tasks...');
  var tasks = {};
  tasks[context.dockertag] = async.series.bind(async, {
    Dockerfile: this.getDockerfileResource(context.source),
    Source: this.getSourceResource(context.source, context.versions)
  });
  this.debug('done building tasks.');
  callback(null, tasks);
};

ImageBuilder.prototype.getSourceResource = function (location, versions) {
  return this.getDirectoryResource(location, versions);
};

ImageBuilder.prototype.getDirectoryResource = function (location, versions) {
  var self = this;
  var protocol = url.parse(location).protocol;
  if (protocol === 's3:') {
    return self.getS3Directory(location, versions).getTask();
  } else {
    self.debug('will not download resource directory: ', location);
  }
};

ImageBuilder.prototype.getDockerfileResource = function (source) {
  var s3Url = url.parse(source);
  s3Url.pathname = join(s3Url.pathname, 'Dockerfile');
  return this.getSingleResource(url.format(s3Url));
};

ImageBuilder.prototype.getSingleResource = function (location) {
  var self = this;
  var s3Url = url.parse(location);
  if (s3Url.protocol === 's3:') {
    var versions = this.options.context.versions;
    var key = s3Url.pathname.substring(1);
    if (versions && versions[key]) {
      s3Url.query = { version: versions[key] };
      delete this.options.context.versions[key];
    }
    location = url.format(s3Url);
    return self.getS3Resource(location).getTask();
  } else {
    self.debug('will not download resource: ', location);
  }
};

ImageBuilder.prototype.runTasks = function (tasks, callback) {
  var self = this;
  self.debug('running tasks...');
  async.series(tasks, function (err, results) {
    if (err) return callback(err);
    self.debug('done running tasks.');
    callback(null, results);
  });
};

ImageBuilder.prototype.buildImages = function (results, callback) {
  new dockerBuilder(results, this.options).build(callback);
};

ImageBuilder.prototype.getS3Resource = function (location) {
  return new s3Resource(location, new this.aws.S3());
};

ImageBuilder.prototype.getS3Directory = function (location, versions) {
  return new s3Directory(location, new this.aws.S3(), versions);
};

module.exports = ImageBuilder;
