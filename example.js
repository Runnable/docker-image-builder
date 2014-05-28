var ImageBuilder = require('./');

var context = {
  dockertag: 'owner/web-server',
  source: 's3://bucket/path/to/some/source/',
  versions: {
    // used to specify versions of files
    'file.txt': 'someVersionInformation',
    'Dockerfile': 'someVersionInformation'
  }
};

var ib = new ImageBuilder({
  dockerHost: 'http://localhost',
  dockerPort: 4243,
  context: context,
  dockerOptions: {
    nocache: true,
    // verbose -- added option to print out all stream data,
    //            not just the 'Step' lines.
    verbose: false
  },
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
