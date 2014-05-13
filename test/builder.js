var Lab = require('lab');
var nock = require('nock');

var ImageBuilder = require('../');

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
var project = projects['1'];
project.contexts = [contexts['1'], contexts['2']];

Lab.experiment('image builder', function () {
  Lab.before(function (done) {
    // set up ImageBuilder
    this.ib = new ImageBuilder({
      dockerHost: 'http://localhost',
      dockerPort: 4243,
      project: project,
      aws: {
        accessKeyId: 'AN-AWS-ACCESS-KEY',
        secretAccessKey: 'AN-AWS-SECRET-ACCESS-KEY'
      }
    });
    // mocks for amazon requests
    nock('https://bucket.s3.amazonaws.com:443:443')
      .get('/path/to/a/Dockerfile?response-content-type=application%2Fjson')
      .reply(200, "FROM runnable/node\n\nWORKDIR /root\nRUN git clone https://github.com/heroku/node-js-sample\n\nWORKDIR /root/node-js-sample\nRUN npm install\nENTRYPOINT [\"node\"]\nCMD [\"web.js\"]");
    nock('https://bucket.s3.amazonaws.com:443:443')
      .get('/?prefix=path%2Fto%2Fsome%2Fsource%2F')
      .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<ListBucketResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><Name>bucket</Name><Prefix>path/to/some/source/</Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents><Key>source/1/</Key><LastModified>2014-04-16T21:32:00.000Z</LastModified><ETag>&quot;1&quot;</ETag><Size>0</Size><Owner><ID>2</ID><DisplayName>name</DisplayName></Owner><StorageClass>STANDARD</StorageClass></Contents></ListBucketResult>");
    nock('https://bucket.s3.amazonaws.com:443:443')
      .get('/source/1/?response-content-type=application%2Fjson')
      .reply(200, "");
    nock('https://bucket.s3.amazonaws.com:443:443')
      .get('/path/to/another/Dockerfile?response-content-type=application%2Fjson')
      .reply(200, 'FROM dockerfile/redis');
    // mocks for docker requests
    nock('http://localhost:4243:4243')
      .filteringRequestBody(function(path) { return '*'; })
      .post('/build?t=owner%2Fweb-server', '*')
      .reply(200, '{"stream": "Successfully built 0123456789001"}');
    nock('http://localhost:4243:4243')
      .filteringRequestBody(function(path) { return '*'; })
      .post('/build?t=owner%2Fcache', '*')
      .reply(200, '{"stream": "Successfully built 0123456789002"}');
    done();
  });
  Lab.after(function (done) {
    delete this.ib;
  });

  Lab.test('returns docker image ids on build', function (done) {
    this.ib.run(function (err, results) {
      if (err) {
        done(err);
      } else {
        Lab.expect(Object.keys(results).length).to.equal(2);
        Lab.expect(Object.keys(results).indexOf('owner/web-server')).to.not.equal(-1);
        Lab.expect(Object.keys(results).indexOf('owner/cache')).to.not.equal(-1);
        Lab.expect(results['owner/web-server']).to.not.equal(results['owner/cache']);
        done();
      }
    });
  });
});
