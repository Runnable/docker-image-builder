# docker-image-builder

[![Build Status](https://travis-ci.org/Runnable/docker-image-builder.svg)](https://travis-ci.org/Runnable/docker-image-builder) [![Dependency Status](https://david-dm.org/Runnable/docker-image-builder.svg)](https://david-dm.org/Runnable/docker-image-builder) [![devDependency Status](https://david-dm.org/Runnable/docker-image-builder/dev-status.svg)](https://david-dm.org/Runnable/docker-image-builder#info=devDependencies)

Builds docker images using remote Dockerfiles and source directories from S3

## Installation

    npm install Runnable/docker-image-builder

## Example

For an example, see `example.js`. Replace the AWS placeholders with valid credentials, and populate the `context` with valid information (`source`, and optionally `versions`). This is how you would use this module externally.

This also assumes you have Docker running locally on the standard port (`4243`).

Be sure to run `npm install` prior to running the example.

Finally, run the example:

    node example.js

You can see more verbose debugging output by setting `DEBUG` before running.

    DEBUG=docker-image-builder:* node example.js

## File Versions

This now supports specifying S3 file versions for specific keys. See the `example.js` for how it is used, but here is the gist: in the `context`, include a key `versions` which is a map of `Key`: `VersionId` and is used to retrieve specific versions of an object out of S3.

## Tests

There is one test written, which can be run using `npm test`. It currently uses `nock` to mock all the calls to S3 and Docker, which makes it run quickly but only test the functionality of the written logic.
