// -- IMPORT LIBRARIES
var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');
var vocab     = require('../model/vocab.js');

const TAG = 'vocab.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- SQL CONSTANTS
const SQL_ALL_INSURANCES                = "CALL R_FETCH_ALL_INSURANCES(?);";
const SQL_ALL_COLLECTORS                = "CALL R_FETCH_ALL_COLLECTORS(?);";
const SQL_ALL_TRAFFIC_LANES             = "CALL R_FETCH_ALL_TRAFFIC_LANES(?);";
const SQL_ALL_COUNTRY_LICENCE_PLATES    = "CALL R_FETCH_ALL_LICENCE_PLATE_COUNTRIES(?);";
const SQL_ALL_DIRECTIONS                = "CALL R_FETCH_ALL_DIRECTIONS(?);";
const SQL_ALL_INDICATORS_BY_DIRECTIONS  = "CALL R_FETCH_INDICATORS_BY_DIRECTION(?, ?);";
const SQL_ALL_INCIDENT_TYPES            = "CALL R_FETCH_ALL_INCIDENT_TYPES(?)";


// -- FACILITATORS
function fetchVocabularies($req, $res, $sp) {
  var $token = $req.params.token;

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

router.get('/directions/:token', function($req, $res) {
  fetchVocabularies($req, $res, SQL_ALL_DIRECTIONS);
});

router.get('/indicators/:direction/:token', function($req, $res) {
  var $token = ju.requires('token', $req.params);
  var $direction = ju.requires('direction', $req.params);

  db.many(SQL_ALL_INDICATORS_BY_DIRECTIONS, [$direction, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

router.get('/traffic_lanes/:token', function($req, $res) {
  fetchVocabularies($req, $res, SQL_ALL_TRAFFIC_LANES);
});

router.get('/country_licence_plates/:token', function($req, $res) {
  fetchVocabularies($req, $res, SQL_ALL_COUNTRY_LICENCE_PLATES);
});

router.get('/incident_types/:token', function($req, $res) {
  fetchVocabularies($req, $res, SQL_ALL_INCIDENT_TYPES);
});

// -- -------------------------------------------------
// -- TIMEFRAME ACTIVITY VOCABS
// -- -------------------------------------------------

router.get('/timeframe/:token', function($req, $res) {
  var $token = ju.requires('token', $req.params);

  vocab.findAllTimeframes($token, function($result) {
    ju.send($req, $res, $result);
  });
});

router.get('/timeframe/activities/:token', function($req, $res) {
  var $token = ju.requires('token', $req.params);

  vocab.findAllTimeframeActivities($token, function($result) {
    ju.send($req, $res, $result);
  });
});

router.get('/timeframe/activity/:timeframe/fees/:token', function($req, $res) {
  var $token = ju.requires('token', $req.params);
  var $timeframe_id = ju.requiresInt('timeframe', $req.params);

  vocab.findAllTimeframeActivityFees($timeframe_id, $token, function($result) {
    ju.send($req, $res, $result);
  });
});


module.exports = router;
