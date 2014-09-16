var _         = require('underscore');
var util      = require('util');
var sendJson  = require("send-data/json");

function RequiredKeyMissing($key) {
  Error.call(this);
  this.key = $key;
  this.statusCode = 400;
  this.message = 'Required field missing: ' + $key;
}

function RequiredIntMissing($key) {
  Error.call(this);
  this.key = $key;
  this.statusCode = 400;
  this.message = 'Required field is not an number: ' + $key;
}

util.inherits(RequiredKeyMissing, Error);
util.inherits(RequiredIntMissing, Error);

var requires = function($key, $jsonData) {
    if($jsonData[$key]) {
      return $jsonData[$key];
    }

    throw new RequiredKeyMissing($key);
}

var requiresInt = function($key, $jsonData) {
  $value = requires($key, $jsonData);

  if($value) {
    if(_.isNaN(parseInt($value))) {
      throw new RequiredIntMissing($key);
    }
  }

  return parseInt($value);
}

var send = function($req, $res, $result) {
  $res.setHeader('Content-Type', 'application/json');

  if($result) {
    if('error' in $result) {
      $res.status($result.statusCode || 400);

      $errormsg = JSON.stringify({
          message: $result.error || 'Internal server error',
          error: {}
      });

      $res.end($errormsg);
    } else {
      $res.status(200);
      sendJson($req, $res, $result);
    }
  } else {
    $res.status(500);

    $errormsg = JSON.stringify({
        message: 'Internal server error',
        error: {}
    });

    $res.end($errormsg);
  }
}

exports.requires = requires;
exports.requiresInt = requiresInt;
exports.send = send;
