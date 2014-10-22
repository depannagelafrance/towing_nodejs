// -- IMPORT LIBRARIES
require('../util/common.js');

var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var LOG       = require('../util/logger.js');
var util      = require('util');

var TAG = 'document.js';

// -- CONFIGURE ROUTING
var router = express.Router();

//-- DEFINE CONSTANST
const SQL_FETCH_DOCUMENT_BY_ID                    = "CALL R_FETCH_DOCUMENT_BY_ID(?,?);";


//-- FETCH THE DOSSIERS
router.get('/:document_id/:token', function($req, $res) {
  var $doc_id = ju.requiresInt('document_id', $req.params);
  var $token  = ju.requires('token', $req.params);

  db.one(SQL_FETCH_DOCUMENT_BY_ID, [$doc_id, $token], function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
});




module.exports = router;
