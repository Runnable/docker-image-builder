var aws = require('aws-sdk');

module.exports = function (options) {
  if (!options.accessKeyId || !options.secretAccessKey) return aws;
  aws.config.update({
    accessKeyId: options.accessKeyId,
    secretAccessKey: options.secretAccessKey
  });
  return aws;
};
