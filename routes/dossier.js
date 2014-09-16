// -- IMPORT LIBRARIES
require('../util/common.js');

var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var LOG       = require('../util/logger.js');
var util      = require('util');

var TAG = 'dossier.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANST
const SQL_CREATE_DOSSIER                    = "CALL R_CREATE_DOSSIER(?);";
const SQL_FETCH_DOSSIER_BY_ID               = "CALL R_FETCH_DOSSIER_BY_ID(?,?)";
const SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER  = "CALL R_FETCH_TOWING_VOUCHERS_BY_DOSSIER(?,?)";
const SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER = "CALL R_FETCH_TOWING_ACTIVITIES_BY_VOUCHER(?, ?, ?);";
const SQL_FETCH_TOWING_PAYMENTS_BY_VOUCHER  = "CALL R_FETCH_TOWING_PAYMENTS_BY_VOUCHER(?, ?, ?); ";
const SQL_FETCH_ALL_DOSSIERS_BY_FILTER      = "CALL R_FETCH_ALL_DOSSIERS_BY_FILTER(?,?);";

const STATUS_NEW                = "NEW";
const STATUS_IN_PROGRESS        = "IN PROGRESS";
const STATUS_COMPLETED          = "COMPLETED";
const STATUS_TO_CHECK           = "TO CHECK";
const STATUS_READY_FOR_INVOICE  = "READY FOR INVOICE";


var listDossiers = function($req, $res, $status) {
  var $token = ju.requires('token', $req.params);

  //fetch the towing activities information
  db.many(SQL_FETCH_ALL_DOSSIERS_BY_FILTER, [$status, $token], function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
}

//-- FETCH THE DOSSIERS
router.get('/:token', function($req, $res) {
  listDossiers($req, $res, STATUS_NEW);
});

router.get('/list/new/:token', function($req, $res) {
  listDossiers($req, $res, STATUS_NEW);
});

router.get('/list/completed/:token', function($req, $res) {
  listDossiers($req, $res, STATUS_COMPLETED);
});

router.get('/list/check/:token', function($req, $res) {
  listDossiers($req, $res, STATUS_TO_CHECK);
});

router.get('/list/invoice/:token', function($req, $res) {
  listDossiers($req, $res, STATUS_READY_FOR_INVOICE);
});



// -- GET A DOSSIER BY ID
router.get('/:dossier/:token', function($req, $res) {
  $dossier_id = $req.params.dossier;
  $token = $req.params.token;

  var $dossier = {};

  db.one(SQL_FETCH_DOSSIER_BY_ID, [$dossier_id, $token], function($error, $d_result, $fields) {
    $dossier = $d_result;

    db.many(SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER, [$dossier_id, $token],function($error, $v_result, $fields) {
      $vouchers = [];

      $v_result.forEach(function($voucher) {
        //fetch the towing payments information
        db.one(SQL_FETCH_TOWING_PAYMENTS_BY_VOUCHER, [$dossier_id, $voucher.id, $token], function($error, $p_result, $fields) {
            $voucher.towing_payments = $p_result;
        });

        //fetch the towing activities information
        db.many(SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER, [$dossier_id, $voucher.id, $token], function($error, $a_result, $fields) {
          $voucher.towing_activities = $a_result;

          $vouchers.push($voucher);

          if($vouchers.length == $v_result.length) {
            $dossier.towing_vouchers = $vouchers;

            ju.send($req, $res, {'dossier': $dossier});
          }
        });
      });
    });
  });
});

// -- CREATE DOSSIER, TOWING VOUCHER
router.post('/', function($req, $res) {
  $jsonData = $req.body;

  $token  = ju.requires('token', $jsonData);

  db.one(SQL_CREATE_DOSSIER, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

// -- UPDATE DOSSIER RELATED INFORMATION
router.put('/:dossier/:token', function($req, $res) {
  $dossier_id = $req.params.dossier;
  $token      = $req.params.token;

  $jsonData   = $req.body;

  $token  = ju.requires('token', $jsonData);

  db.one(SQL_PROCESS_TOKEN_AUTH, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});


module.exports = router;
