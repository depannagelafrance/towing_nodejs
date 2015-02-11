
var db        = require('../util/database.js');
var LOG       = require('../util/logger.js');

var TAG = 'model/vocab.js';

const SQL_FETCH_ALL_TIMEFRAMES                  = "CALL R_FETCH_ALL_TIMEFRAMES(?);";
const SQL_FETCH_ALL_TIMEFRAME_ACTIVITIES        = "CALL R_FETCH_ALL_TIMEFRAME_ACTIVITIES(?);";
const SQL_FETCH_ALL_TIMEFRAME_ACTIVITY_FEES     = "CALL R_FETCH_ALL_TIMEFRAME_ACTIVITY_FEES(?,?);";
const SQL_FETCH_ALL_TRAFFIC_POSTS_BY_ALLOTMENT  = "CALL R_FETCH_ALL_TRAFFIC_POSTS_BY_ALLOTMENT(?,?); ";
const SQL_FETCH_ALL_DRIVERS_BY_TYPE             = "CALL R_FETCH_ALL_DRIVERS_BY_TYPE(?,?); ";
const SQL_FETCH_ALL_VEHICLES_BY_TYPE            = "CALL R_FETCH_ALL_VEHICLES_BY_TYPE(?,?); ";

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

var findAllTrafficPostsByAllotment = function($allotment_id, $token, cb) {
  db.many(SQL_FETCH_ALL_TRAFFIC_POSTS_BY_ALLOTMENT, [$allotment_id, $token], function($error, $result, $fields) {
    cb($result);
  });
}

var findAllDriversByType = function($type, $token, cb) {
  db.many(SQL_FETCH_ALL_DRIVERS_BY_TYPE, [$type, $token], function($error, $result, $fields) {
    cb($result);
  });
}

var findAllVehiclesByType = function($type, $token, cb) {
  db.many(SQL_FETCH_ALL_VEHICLES_BY_TYPE, [$type, $token], function($error, $result, $fields) {
    cb($result);
  });
}


exports.findAllTimeframes               = findAllTimeframes;
exports.findAllTimeframeActivities      = findAllTimeframeActivities;
exports.findAllTimeframeActivityFees    = findAllTimeframeActivityFees;
exports.findAllTrafficPostsByAllotment  = findAllTrafficPostsByAllotment;
exports.findAllDriversByType            = findAllDriversByType;
exports.findAllVehiclesByType           = findAllVehiclesByType;
