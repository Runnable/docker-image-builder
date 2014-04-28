# docker-image-builder

[![Dependency Status](https://david-dm.org/Runnable/docker-image-builder.svg)](https://david-dm.org/Runnable/docker-image-builder)

Builds docker images using remote Dockerfiles and source directories from S3

## Installation

    npm install Runnable/docker-image-builder

## Example

For an example, see `example.js`. Replace the AWS placeholders with valid credentials, and populate the `contexts` with valid information (`dockerfile`, and `source.location` for each). This is how you would use this module externally.

This also assumes you have Docker running locally on the standard port (`4243`).

Be sure to run `npm install` prior to running the example.

Finally, run the example:

    node example.js

You can see more verbose debugging output by setting `DEBUG` before running.

    DEBUG=docker-image-builder:* node example.js

## Tests

Coming soon...
