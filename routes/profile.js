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
const SQL_ADD_SIGNATURE_TO_USER_PROFILE                    = "CALL R_ADD_SIGNATURE_TO_USER_PROFILE(?,?,?,?);";


//-- FETCH THE DOSSIERS
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
