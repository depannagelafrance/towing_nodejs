// -- IMPORT LIBRARIES
require('../util/common.js');

var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var LOG       = require('../util/logger.js');
var util      = require('util');

var TAG = 'profile.js';

// -- CONFIGURE ROUTING
var router = express.Router();

//-- DEFINE CONSTANST
const SQL_ADD_SIGNATURE_TO_USER_PROFILE   = "CALL R_ADD_SIGNATURE_TO_USER_PROFILE(?,?,?,?);";
const SQL_UPDATE_PROFILE                  = "CALL R_UPDATE_USER_PROFILE(?,?,?,?,?);";


//-- CREATE A SIGNATURE
router.put('/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);

  var $is_signa         = ju.requiresInt('is_signa', $req.body);
  var $is_towing        = ju.requiresInt('is_towing', $req.body);
  var $licence_plate    = ju.requires('licence_plate', $req.body);
  var $registration_id  = ju.requires('registration_id', $req.body);

  db.one(SQL_UPDATE_PROFILE, [$is_signa, $is_towing, $licence_plate, $registration_id, $token], function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
});

//-- CREATE A SIGNATURE
router.post('/signature/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);

  var $content_type = ju.requires('content_type', $req.body);
  var $file_size    = ju.requiresInt('file_size', $req.body);
  var $content      = ju.requires('content', $req.body);

  db.one(SQL_ADD_SIGNATURE_TO_USER_PROFILE, [$content_type, $file_size, $content, $token], function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
});




module.exports = router;
