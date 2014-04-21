var _ = require('lodash');
var async = require('async');
var Docker = require('dockerode');
var join = require('path').join;
var tar = require('tar-stream');
var url = require('url');

module.exports = DockerBuilder;

function DockerBuilder (project, options) {
  var dockerOptions = (options.dockerSocketPath) ?
    { socketPath: options.dockerSocketPath } :
    { host: options.dockerHost, port: options.dockerPort };
  this.docker = new Docker(dockerOptions);
  this.debug = require('debug')('docker-image-builder:DockerBuilder');
  this.project = project || {};
  this.options = _.pick(options, ['nocache', 'q']) || {}; // no default tag ('t')
}

DockerBuilder.prototype.build = function (callback) {
  var self = this;
  this.debug('starting build!');
  var builds = [];
  _.each(this.project, function (context, tag) {
    var debug = require('debug')('docker-image-builder:packer:' + tag);
    debug('packing');
    var pack = tar.pack();
    _.each(context.Source, function (data, path) {
      pack.entry({
        name: join('src', path),
        type: (_.last(path) === '/') ? 'directory' : 'file'
      }, data.Body.toString());
    });

    if (context.Dockerfile) {
      pack.entry({
        name: 'Dockerfile'
      }, context.Dockerfile.Body.toString());
    }
    pack.finalize();

    var options = _.clone(self.options);
    if (!options.t) options.t = tag;
    builds.push([pack, options]);
    debug('packed');
  });

  async.mapSeries(
    builds,
    self.dockerBuild.bind(self),
    function (err, imageIds) {
      self.debug('done building all of the things!');
      callback(err, imageIds);
    });
};

DockerBuilder.prototype.dockerBuild = function (build, callback) {
  // build is an array: [pack, { options }]...
  // we push on a callback and apply to buildImage
  var debug = require('debug')('docker-image-builder:docker:' + build[1].t);
  debug('starting build');
  build.push(function (err, res) {
    if (err) return callback(err);
    var error = null;
    var imageId;
    var data;
    res.on('data', function (raw) {
      try {
        if (!data) {
          data = JSON.parse(raw);
        }
        else {
          data += raw.toString();
          data = JSON.parse(data);
        }
      } catch (e) {
        data = raw.toString();
        return;
      }
      if (data.stream) {
        data.stream = data.stream.trim();
        var success = /Successfully built ([a-f0-9]+)/.exec(data.stream);
        if (success) {
          debug(data.stream);
          imageId = success[1];
        }
        if (/Step [0-9]+.*/.test(data.stream)) debug(data.stream);
      }
      else if (data.error) {
        error = data;
        debug(data.error.trim());
        if (data.errorDetail) debug(data.errorDetail.message.trim());
      }
      data = undefined;
    });
    res.on('end', function () { 
      if (!error) {
        debug('done building!');
        callback(null, imageId);
      }
      else {
        debug('done, with error. see above');
        callback(new Error('Docker Build Error: ' + error.error));
      }
    });
  });
  this.docker.buildImage.apply(this.docker, build);
};
