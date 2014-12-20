var util      = require('util');

function InvalidRequest() {
  Error.call(this);
  this.statusCode = 400;
  this.message = 'Invalid Request';
}

function InvalidVatNumber($vat) {
  Error.call(this);
  this.statusCode = 400;
  this.message = 'Invalid VAT Number: ' + $vat;
}

util.inherits(InvalidRequest, Error);
util.inherits(InvalidVatNumber, Error);

exports.InvalidRequest = InvalidRequest;
exports.InvalidVatNumber = InvalidVatNumber;
