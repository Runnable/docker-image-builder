var ImageBuilder = require('./');

var projects = {
  '1': {
    id: 1,
    name: 'Example Project',
    contexts: ['1', '2']
  }
};

var contexts = {
  '1': {
    id: 1,
    dockertag: 'owner/web-server',
    dockerfile: 's3://bucket/path/to/a/Dockerfile',
    source: {
      type: 'local',
      location: 's3://bucket/path/to/some/source/'
    }
  },
  '2': {
    id: 2,
    dockertag: 'owner/cache',
    dockerfile: 's3://bucket/path/to/another/Dockerfile',
    source: {}
  }
};

// let's create the Image from each of the contexts, and return information for both

var project = projects['1'];
project.contexts = [contexts['1'], contexts['2']];

var ib = new ImageBuilder({
  dockerHost: 'http://localhost',
  dockerPort: 4243,
  project: project,
  aws: {
    accessKeyId: 'AN-AWS-ACCESS-KEY',
    secretAccessKey: 'AN-AWS-SECRET-ACCESS-KEY'
  }
});
ib.run(function (err, result) {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  else {
    console.log(result);
    process.exit(0);
  }
});
