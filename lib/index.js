var _ = require('lodash');
var async = require('async');
var url = require('url');

var s3Resource = require('./S3Resource');
var s3Directory = require('./S3Directory');
var dockerBuilder = require('./DockerBuilder');

var ImageBuilder = function (options) {
  if (!(this instanceof ImageBuilder)) {
    return new ImageBuilder(options);
  }
  this.debug = require('debug')('docker-image-builder:main');
  this.options = options || {};
  if (this.options.aws) {
    this.aws = require('./aws')(this.options.aws);
  }
};

ImageBuilder.prototype.run = function (callback) {
  var self = this;
  self.debug('running!');
  async.waterfall([
    this.buildTasks.bind(this),
    this.runTasks.bind(this),
    this.buildImages.bind(this)
  ], function (err, results) {
    if (err) {
      return callback(err);
    }
    self.debug('done running!');
    var data = {};
    results.forEach(function (result) {
      _.extend(data, result);
    });
    callback(null, data);
  });
};

ImageBuilder.prototype.buildTasks = function (callback) {
  var self = this;
  self.debug('building tasks...');
  var tasks = {};
  _.each(this.options.project.contexts, function (context) {
    var subTasks = {};
    subTasks.Dockerfile = self.getDockerfileResource(context.dockerfile);
    if (context.source.type === 'local') {
      subTasks.Source = self.getSourceResource(context.source.location, context.versions);
    }
    tasks[context.dockertag] = async.series.bind(async, subTasks);
  });
  self.debug('done building tasks.');
  callback(null, tasks);
};

ImageBuilder.prototype.getSourceResource = function (location, versions) {
  return this.getDirectoryResource(location, versions);
};

ImageBuilder.prototype.getDirectoryResource = function (location, versions) {
  var self = this;
  protocol = url.parse(location).protocol;
  if (protocol === 's3:') {
    return self.getS3Directory(location, versions).getTask();
  } else {
    self.debug('will not download resource directory: ', location);
  }
};

ImageBuilder.prototype.getDockerfileResource = function (dockerfile) {
  return this.getSingleResource(dockerfile);
};

ImageBuilder.prototype.getSingleResource = function (location) {
  var self = this;
  protocol = url.parse(location).protocol;
  if (protocol === 's3:') {
    return self.getS3Resource(location).getTask();
  } else {
    self.debug('will not download resource: ', location);
  }
};

ImageBuilder.prototype.runTasks = function (tasks, callback) {
  var self = this;
  self.debug('running tasks...');
  async.series(tasks, function (err, results) {
    if (err) {
      return callback(err);
    }
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
