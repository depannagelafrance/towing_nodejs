const DEBUG_LEVEL = 1000;

const LEVEL_DEBUG = 1000;
const LEVEL_INFO  = 500;
const LEVEL_ERR   = 100;

const LEVEL_LABELS = {
  1000: "D/",
  500 : "I/",
  100 : "E/"
}

var log = function($tag, $message, $level) {
  if(DEBUG_LEVEL >= $level) {
    
    console.log(
      new Date().toISOString()
      + " - "
      + $tag
      + " - "
      + LEVEL_LABELS[$level]
      + " - "
      + $message
    );
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
