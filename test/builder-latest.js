var Lab = require('lab');
var nock = require('nock');

var ImageBuilder = require('../');

var context = {
  dockertag: 'owner/web-server',
  source: 's3://bucket/path/to/some/source/'
};

Lab.experiment('image builder without versions', function () {
  Lab.before(function (done) {
    // set up ImageBuilder
    this.ib = new ImageBuilder({
      dockerHost: 'http://localhost',
      dockerPort: 4243,
      context: context,
      aws: {
        accessKeyId: 'AN-AWS-ACCESS-KEY',
        secretAccessKey: 'AN-AWS-SECRET-ACCESS-KEY'
      }
    });
    // mocks for amazon requests
    // nock.recorder.rec();
    nock('https://bucket.s3.amazonaws.com:443')
      .get('/path/to/some/source/Dockerfile?response-content-type=application%2Fjson')
      .reply(200, "FROM runnable/node\n\nWORKDIR /root\nRUN git clone https://github.com/heroku/node-js-sample\n\nWORKDIR /root/node-js-sample\nRUN npm install\nENTRYPOINT [\"node\"]\nCMD [\"web.js\"]");
    nock('https://bucket.s3.amazonaws.com:443')
      .get('/?prefix=path%2Fto%2Fsome%2Fsource%2F')
      .reply(200, "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<ListBucketResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><Name>bucket</Name><Prefix>path/to/some/source/</Prefix><Marker></Marker><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated><Contents></Contents></ListBucketResult>");
    nock('https://bucket.s3.amazonaws.com:443')
      .get('/source/1/?response-content-type=application%2Fjson')
      .reply(200, "");
    // mocks for docker requests
    nock('http://localhost:4243')
      .filteringRequestBody(function (path) { return '*'; })
      .post('/build?t=owner%2Fweb-server', '*')
      .reply(200, '{"stream": "Successfully built 0123456789001"}');
    done();
  });
  Lab.after(function (done) {
    delete this.ib;
    done();
  });

  Lab.test('returns docker image ids built from latest', function (done) {
    this.ib.run(function (err, results) {
      if (err) {
        done(err);
      } else {
        Lab.expect(Object.keys(results)).to.have.length(1);
        Lab.expect(results['owner/web-server']).to.equal('0123456789001');
        done();
      }
    });
  });
});
