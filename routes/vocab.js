// -- IMPORT LIBRARIES
var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');

const TAG = 'vocab.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- SQL CONSTANTS
const SQL_ALL_INSURANCES                = "CALL R_FETCH_ALL_INSURANCES(?);";
const SQL_ALL_COLLECTORS                = "CALL R_FETCH_ALL_COLLECTORS(?);";
const SQL_ALL_TRAFFIC_LANES             = "CALL R_FETCH_ALL_TRAFFIC_LANES(?);";
const SQL_ALL_COUNTRY_LICENCE_PLATES    = "CALL R_FETCH_ALL_LICENCE_PLATE_COUNTRIES(?);";

// -- FACILITATORS
function fetchVocabularies($req, $res, $sp) {
  var $token = $req.params.token;

  LOG.d(TAG, "Using token: " + $token);
  LOG.d(TAG, "Executing stored procedure: " + $sp);

  db.many($sp, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
}

//-- ROUTES
router.get('/insurances/:token', function($req, $res) {
  fetchVocabularies($req, $res, SQL_ALL_INSURANCES);
});

router.get('/collectors/:token', function($req, $res) {
  fetchVocabularies($req, $res, SQL_ALL_COLLECTORS);
});

router.get('/traffic_lanes/:token', function($req, $res) {
  fetchVocabularies($req, $res, SQL_ALL_TRAFFIC_LANES);
});

router.get('/country_licence_plates/:token', function($req, $res) {
  fetchVocabularies($req, $res, SQL_ALL_COUNTRY_LICENCE_PLATES);
});

module.exports = router;
