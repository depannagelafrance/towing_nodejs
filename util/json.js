var util      = require('util');
var sendJson  = require("send-data/json");

function RequiredKeyMissing($key) {
  Error.call(this);
  this.key = $key;
  this.statusCode = 400;
  this.message = 'Required field missing';
}

util.inherits(RequiredKeyMissing, Error);

var requires = function($key, $jsonData) {
    if($jsonData[$key]) {
      console.log("Found required key: " + $key);

      return $jsonData[$key];
    }

    throw new RequiredKeyMissing($key);
}

var send = function($req, $res, $result) {
  $res.setHeader('Content-Type', 'application/json');

  if('error' in $result) {
    $res.status($result.statusCode || 400);

    $errormsg = JSON.stringify({
        message: $result.error || 'Internal server error',
        error: {}
    });

    console.log($errormsg);

    $res.end($errormsg);
  } else {
    $res.status(200);
    sendJson($req, $res, $result);
  }
}

exports.requires = requires;
exports.send = send;
