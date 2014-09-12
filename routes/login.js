// -- IMPORT LIBRARIES

var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');

const TAG = 'login.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANST
const SQL_PROCESS_LOGIN       = "CALL R_LOGIN(?,?);";
const SQL_PROCESS_TOKEN_AUTH  = "CALL R_LOGIN_TOKEN(?)";


// -- ONLY POSTS ARE ALLOWED
router.get('/', function($req, $res) {
  throw new common.InvalidRequest();
});

// -- PROCESS LOGIN
router.post('/', function($req, $res) {
  $jsonData = $req.body;

  $login  = ju.requires('login', $jsonData);
  $pwd    = ju.requires('password', $jsonData);

  db.one(SQL_PROCESS_LOGIN, [$login,$pwd], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

// -- PROCESS TOKEN LOGIN
router.post('/token', function($req, $res) {
  $jsonData = $req.body;

  $token  = ju.requires('token', $jsonData);

  db.one(SQL_PROCESS_TOKEN_AUTH, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

//-- PROCESS FORGOT PASSWORD
router.post('/forgot', function($req, $res) {
  throw new common.InvalidRequest();
});



module.exports = router;
