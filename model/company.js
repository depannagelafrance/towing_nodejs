var db        = require('../util/database.js');
var LOG       = require('../util/logger.js');
var common    = require('../util/common.js');

var TAG = 'model/company.js';

const SQL_FETCH_COMPANY         = "CALL R_FETCH_USER_COMPANY(?);";

var findCurrentCompany = function($token, cb) {
  db.one(SQL_FETCH_COMPANY, [$token], function($error, $result, $fields) {
    cb($result);
  });
}

exports.findCurrentCompany = findCurrentCompany;
