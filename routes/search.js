// -- IMPORT LIBRARIES
var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');

const TAG = 'search.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANTS
const SQL_SEARCH_TOWING_VOUCHERS         = "CALL R_SEARCH_TOWING_VOUCHER(?,?,?,?,?,?);";
const SQL_SEARCH_TOWING_VOUCHERS_BY_NR   = "CALL R_SEARCH_TOWING_VOUCHER_BY_NUMBER(?,?);";


// -- ONLY POSTS ARE ALLOWED
router.get('/', function($req, $res) {
  throw new common.InvalidRequest();
});


router.post('/:token', function($req, $res) {
  var $token = $req.params.token;

  var $call_number    = $req.body['call_number'];
  var $date           = $req.body['date'];
  var $type           = $req.body['car_type'];
  var $licence_plate  = $req.body['licence_plate'];
  var $name           = $req.body['customer_name'];

  if($call_number || $date || $type || $licence_plate || $name)
  {
    db.many(SQL_SEARCH_TOWING_VOUCHERS, $params, function($error, $result, $fields) {
      ju.send($req, $res, $result);
    });
  }
  else
  {
    throw new common.InvalidRequest();
  }
});

router.post('/towing_voucher/:token', function($req, $res) {
    var $token = $req.params.token;

    var $voucher_number = ju.requires('number', $req.body);

    if($voucher_number)
    {
      db.many(SQL_SEARCH_TOWING_VOUCHERS_BY_NR, [$voucher_number, $token], function($error, $result, $fields) {
        ju.send($req, $res, $result);
      });
    }
    else
    {
      throw new common.InvalidRequest();
    }
});


module.exports = router;
