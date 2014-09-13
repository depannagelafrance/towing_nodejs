// -- IMPORT LIBRARIES
var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');

const TAG = 'vocab.js';

// -- CONFIGURE ROUTING
var router = express.Router();


// -- -------------------------------------------------
// -- INSURANCE MANAGEMENT
// -- -------------------------------------------------
const SQL_ALL_INSURANCES    = "CALL R_FETCH_ALL_INSURANCES(?);";

router.get('/insurances/:token', function($req, $res) {
  var $token = $req.params.token;

  console.log($token + " was found");

  db.many(SQL_ALL_INSURANCES, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});


// -- -------------------------------------------------
// -- COLLECTOR MANAGEMENT
// -- -------------------------------------------------

const SQL_ALL_COLLECTORS    = "CALL R_FETCH_ALL_COLLECTORS(?);";

router.get('/collectors/:token', function($req, $res) {
  var $token = $req.params.token;

  db.many(SQL_ALL_COLLECTORS, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});




module.exports = router;
