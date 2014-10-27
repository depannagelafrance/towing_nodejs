
var db        = require('../util/database.js');
var LOG       = require('../util/logger.js');

var TAG = 'model/vocab.js';



const SQL_FETCH_ALL_TIMEFRAMES              = "CALL R_FETCH_ALL_TIMEFRAMES(?);";
const SQL_FETCH_ALL_TIMEFRAME_ACTIVITIES    = "CALL R_FETCH_ALL_TIMEFRAME_ACTIVITIES(?);";
const SQL_FETCH_ALL_TIMEFRAME_ACTIVITY_FEES = "CALL R_FETCH_ALL_TIMEFRAME_ACTIVITY_FEES(?,?);";


var findAllTimeframes = function($token, cb) {
  db.many(SQL_FETCH_ALL_TIMEFRAMES, [$token], function($error, $result, $fields) {
    cb($result);
  });
};

var findAllTimeframeActivities = function($token, cb) {
  db.many(SQL_FETCH_ALL_TIMEFRAME_ACTIVITIES, [$token], function($error, $result, $fields) {
    cb($result);
  });
};

var findAllTimeframeActivityFees = function($timeframe_id, $token, cb) {
  db.many(SQL_FETCH_ALL_TIMEFRAME_ACTIVITY_FEES, [$timeframe_id, $token], function($error, $result, $fields) {
    cb($result)
  });

};


exports.findAllTimeframes = findAllTimeframes;
exports.findAllTimeframeActivities = findAllTimeframeActivities;
exports.findAllTimeframeActivityFees = findAllTimeframeActivityFees;
