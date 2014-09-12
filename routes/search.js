// -- IMPORT LIBRARIES
var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');

const TAG = 'search.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANST
const SQL_CREATE_USER         = "CALL R_CREATE_USER(?, ?, ?, ?, ?);";
const SQL_USER_BY_ID          = "CALL R_FETCH_USER_BY_ID(?,?);";


// -- ONLY POSTS ARE ALLOWED
router.get('/', function($req, $res) {
  throw new common.InvalidRequest();
});


router.post('/:token', function($req, $res) {
  var $token = $req.params.token;

  var $call_number = $req.body['call_number'];
  var $date = $req.body['date'];
  var $type = $req.body['car_type'];
  var $licence_plate = $req.body['licence_plate'];
  var $name = $req.body['customer_name'];

  if($call_number || $date || $type || $licence_plate || $name) {

  } else {
    throw new common.InvalidRequest();
  }
});

router.post('/towing_voucher/:token', function($req, $res) {
    var $token = $req.params.token;
    
    var $voucher_number = ju.requires('number', $req.body);
});


module.exports = router;
