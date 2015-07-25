// -- IMPORT LIBRARIES
var _           = require('underscore');
var express     = require('express');
var fs          = require('fs');
var path        = require('path');
var phantom     = require('node-phantom-simple');
var dateFormat  = require('dateformat');
var crypto      = require('crypto');

var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');
var settings  = require('../settings/settings.js');
var vocab     = require('../model/vocab.js');

var dossier   = require('../model/dossier.js');

const TAG = 'report.js';

// -- CONFIGURE ROUTING
var router = express.Router();

// -- ONLY POSTS ARE ALLOWED
router.get('/towing_voucher/:type/:dossier_id/:voucher_id/:token', function($req, $res) {
  var $dossier_id = ju.requiresInt('dossier_id', $req.params);
  var $voucher_id = ju.requiresInt('voucher_id', $req.params);
  var $token      = ju.requires('token', $req.params);
  var $type       = ju.requires('type', $req.params);

  dossier.createTowingVoucherReport($dossier_id, $voucher_id, $type, $token, $res, $res, function($filename, $data) {
    ju.send($req, $res, {
      "filename" : $filename,
      "content_type" : "application/pdf",
      "data" : $data
    });
  });
});

module.exports = router;
