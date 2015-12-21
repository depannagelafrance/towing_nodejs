// -- IMPORT LIBRARIES
var express = require('express');
var db = require('../util/database.js');
var ju = require('../util/json.js');
var common = require('../util/common.js');
var LOG = require('../util/logger.js');
var vocab = require('../model/vocab.js');

const TAG = 'vocab.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- SQL CONSTANTS
const SQL_ALL_INSURANCES = "CALL R_FETCH_ALL_INSURANCES(?);";
const SQL_ALL_COLLECTORS = "CALL R_FETCH_ALL_COLLECTORS(?);";
const SQL_ALL_TRAFFIC_LANES = "CALL R_FETCH_ALL_TRAFFIC_LANES(?);";
const SQL_ALL_COUNTRY_LICENCE_PLATES = "CALL R_FETCH_ALL_LICENCE_PLATE_COUNTRIES(?);";
const SQL_ALL_DIRECTIONS = "CALL R_FETCH_ALL_DIRECTIONS(?);";
const SQL_FETCH_DIRECTION_BY_ID = "CALL R_FETCH_DIRECTION_BY_ID(?,?);";
const SQL_ALL_INDICATORS_BY_DIRECTIONS = "CALL R_FETCH_INDICATORS_BY_DIRECTION(?, ?);";
const SQL_FETCH_DIRECTION_INDICATOR_BY_ID = "CALL R_FETCH_DIRECTION_INDICATOR_BY_ID(?,?);";
const SQL_ALL_INCIDENT_TYPES = "CALL R_FETCH_ALL_INCIDENT_TYPES(?)";
const SQL_ALL_VEHICLES = "CALL R_FETCH_ALL_VEHICLES(?)";

const SQL_ADD_DIRECTION_INDICATOR = "CALL R_ADD_DIRECTION_INDICATOR(?,?,?,?,?,?,?,?);";
const SQL_UPDATE_DIRECTION_INDICATOR = "CALL R_UPDATE_DIRECTION_INDICATOR(?,?,?,?,?,?,?,?,?);";
const SQL_REMOVE_DIRECTION_INDICATOR = "CALL R_DELETE_DIRECTION_INDICATOR(?,?,?);";

const SQL_ADD_DIRECTION = "CALL R_ADD_DIRECTION(?,?);";
const SQL_UPDATE_DIRECTION = "CALL R_UPDATE_DIRECTION(?,?,?);";
const SQL_REMOVE_DIRECTION = "CALL R_DELETE_DIRECTION_INDICATOR(?,?);";


// -- FACILITATORS
function fetchVocabularies($req, $res, $sp) {
    var $token = $req.params.token;

    db.many($sp, [$token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
}

//-- ROUTES
router.get('/insurances/:token', function ($req, $res) {
    fetchVocabularies($req, $res, SQL_ALL_INSURANCES);
});

router.get('/collectors/:token', function ($req, $res) {
    fetchVocabularies($req, $res, SQL_ALL_COLLECTORS);
});

router.get('/directions/:token', function ($req, $res) {
    fetchVocabularies($req, $res, SQL_ALL_DIRECTIONS);
});

router.post('/directions/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $name = ju.requires('name', $req.body);

    db.one(SQL_ADD_DIRECTION, [$name, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.put('/directions/:direction/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $direction = ju.requiresInt('direction', $req.params);

    var $name = ju.requires('name', $req.body);

    db.one(SQL_UPDATE_DIRECTION, [$direction, $name, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.delete('/directions/:direction/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $direction = ju.requiresInt('direction', $req.params);

    db.one(SQL_REMOVE_DIRECTION, [$direction, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});


router.get('/direction/:direction/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $direction = ju.requiresInt('direction', $req.params);

    db.one(SQL_FETCH_DIRECTION_BY_ID, [$direction, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/indicators/:direction/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $direction = ju.requiresInt('direction', $req.params);

    db.many(SQL_ALL_INDICATORS_BY_DIRECTIONS, [$direction, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/indicators/:direction/:indicator/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $direction = ju.requiresInt('direction', $req.params);
    var $indicator = ju.requiresInt('indicator', $req.params);

    db.one(SQL_FETCH_DIRECTION_INDICATOR_BY_ID, [$indicator, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.post('/indicators/:direction/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $direction = ju.requires('direction', $req.params);

    var $name = ju.requires('name', $req.body);
    var $zip = ju.requires('zip', $req.body);
    var $city = ju.requires('city', $req.body);
    var $lat = ju.valueOf('lat', $req.body);
    var $long = ju.valueOf('long', $req.body);
    var $sequence = ju.intValueOf('sequence', $req.body);

    db.one(SQL_ADD_DIRECTION_INDICATOR, [$direction, $name, $zip, $city, $lat, $long, $sequence, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.put('/indicators/:direction/:indicator/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $direction = ju.requiresInt('direction', $req.params);
    var $indicator = ju.requiresInt('indicator', $req.params);

    var $name = ju.requires('name', $req.body);
    var $zip = ju.requires('zip', $req.body);
    var $city = ju.requires('city', $req.body);
    var $lat = ju.valueOf('lat', $req.body);
    var $long = ju.valueOf('long', $req.body);
    var $sequence = ju.intValueOf('sequence', $req.body);

    db.one(SQL_UPDATE_DIRECTION_INDICATOR, [$indicator, $direction, $name, $zip, $city, $lat, $long, $sequence, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.delete('/indicators/:direction/:indicator/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $direction = ju.requiresInt('direction', $req.params);
    var $indicator = ju.requiresInt('indicator', $req.params);

    db.one(SQL_REMOVE_DIRECTION_INDICATOR, [$indicator, $direction, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/traffic_lanes/:token', function ($req, $res) {
    fetchVocabularies($req, $res, SQL_ALL_TRAFFIC_LANES);
});

router.get('/country_licence_plates/:token', function ($req, $res) {
    fetchVocabularies($req, $res, SQL_ALL_COUNTRY_LICENCE_PLATES);
});

router.get('/incident_types/:token', function ($req, $res) {
    fetchVocabularies($req, $res, SQL_ALL_INCIDENT_TYPES);
});

router.get('/vehicles/:token', function ($req, $res) {
    fetchVocabularies($req, $res, SQL_ALL_VEHICLES);
});


// -- -------------------------------------------------
// -- TIMEFRAME ACTIVITY VOCABS
// -- -------------------------------------------------

router.get('/timeframe/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    vocab.findAllTimeframes($token, function ($result) {
        ju.send($req, $res, $result);
    });
});

router.get('/timeframe/activities/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    vocab.findAllTimeframeActivities($token, function ($result) {
        ju.send($req, $res, $result);
    });
});

router.get('/timeframe/activity/:timeframe/fees/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $timeframe_id = ju.requiresInt('timeframe', $req.params);

    vocab.findAllTimeframeActivityFees($timeframe_id, $token, function ($result) {
        ju.send($req, $res, $result);
    });
});

// -- -------------------------------------------------
// -- POLICE TRAFFIC POSTS
// -- -------------------------------------------------
router.get('/trafficpost/allotment/:allotment/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $allotment_id = ju.requiresInt('allotment', $req.params);

    vocab.findAllTrafficPostsByAllotment($allotment_id, $token, function ($result) {
        ju.send($req, $res, $result);
    });
});


// -- -------------------------------------------------
// -- DRIVERS
// -- -------------------------------------------------
router.get('/drivers/:type/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $type = ju.requiresEnum('type', $req.params, ['signa', 'towing']);

    vocab.findAllDriversByType($type, $token, function ($result) {
        ju.send($req, $res, $result);
    });
});

// -- -------------------------------------------------
// -- VEHICLES
// -- -------------------------------------------------
router.get('/vehicles/:type/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $type = ju.requiresEnum('type', $req.params, ['signa', 'towing']);

    vocab.findAllVehiclesByType($type, $token, function ($result) {
        ju.send($req, $res, $result);
    });
});

module.exports = router;
