var util      = require('util');

function InvalidRequest() {
  Error.call(this);
  this.statusCode = 400;
  this.message = 'Invalid Request';
}

util.inherits(InvalidRequest, Error);

exports.InvalidRequest = InvalidRequest;
