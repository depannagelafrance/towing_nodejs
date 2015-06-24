const DEBUG_LEVEL = 1000;

const LEVEL_DEBUG = 1000;
const LEVEL_INFO  = 500;
const LEVEL_ERR   = 100;



const LEVEL_LABELS = {
  1000: "D/",
  500 : "I/",
  100 : "E/"
}

var LOGGERS = {};


var log = function($tag, $message, $level) {
  if(DEBUG_LEVEL >= $level) {
    if($level == DEBUG_LEVEL) {

      if(!LOGGERS['towing:'+$tag]) {
        LOGGERS['towing:'+$tag] = require('debug')('towing:' + $tag)
      }

      var debug = LOGGERS['towing:'+$tag];

      debug(
      // console.log(
        new Date().toISOString()
        + " - "
        + $message //($message.length > 500 ? $message.substring(0, 500) + '...' : $message)
      );
    } else {
      console.log(
        new Date().toISOString()
        + " - "
        + $tag
        + " - "
        + LEVEL_LABELS[$level]
        + " - "
        + $message //($message.length > 500 ? $message.substring(0, 500) + '...' : $message)
      );
    }
  }
}

var debug = function($tag, $message) {
  log($tag, $message, LEVEL_DEBUG);
}

var info = function($tag, $message) {
  log($tag, $message, LEVEL_INFO);
}

var err = function($tag, $message) {
  log($tag, $message, LEVEL_ERR);
}

exports.d = debug;
exports.i = info;
exports.e = err;
