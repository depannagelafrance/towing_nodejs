// -- IMPORT LIBRARIES
require('../util/common.js');

var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var util      = require('util');


// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANST
const SQL_CREATE_DOSSIER                    = "CALL R_CREATE_DOSSIER(?);";
const SQL_FETCH_DOSSIER_BY_ID               = "CALL R_FETCH_DOSSIER_BY_ID(?,?)";
const SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER  = "CALL R_FETCH_TOWING_VOUCHERS_BY_DOSSIER(?,?)";

// -- DEFAULT GETTER RETURNS NOTHING
router.get('/', function($req, $res) {
  throw new InvalidRequest();
});

// -- GET A DOSSIER BY ID
router.get('/:dossier/:token', function($req, $res) {
  $dossier_id = $req.params.dossier;
  $token = $req.params.token;

  db.one(SQL_FETCH_DOSSIER_BY_ID, [$dossier_id, $token], function($error, $result, $fields) {
    var $dossier = $result;

    db.many(SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER, [$dossier_id, $token],function($error, $result, $fields) {
      $dossier['towing_vouchers'] = $result;

      ju.send($req, $res, {'dossier': $dossier});
    });
  });
});

// -- CREATE DOSSIER, TOWING VOUCHER
router.post('/', function($req, $res) {
  $jsonData = $req.body;

  $login  = ju.requires('login', $jsonData);
  $pwd    = ju.requires('password', $jsonData);

  db.one(SQL_CREATE_DOSSIER, [$login,$pwd], function($error, $result, $fields) {
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
