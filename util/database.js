// require modules
var mysql       = require('mysql');
var LOG         = require('../util/logger.js');
var settings    = require('../settings/settings.js');

const TAG = "database.js";

// connect to mysql
var pool = mysql.createPool(settings.mysql);

pool.getConnection(function($err, $connection) {
  // connected! (unless `err` is set)

  if($connection) {
    $connection.release();
  }

  if($err) {
    LOG.d(TAG, "==========================================================================================");
    LOG.d(TAG, " ERROR")
    LOG.d(TAG, "==========================================================================================");
    LOG.d(TAG, "Unable to connect to MySQL instance, please check if the MySQL is running and reachable.");
    LOG.d(TAG, $err);
    LOG.d(TAG, "==========================================================================================");

		throw new Error($err);
  }
});


var one = function($sql, $params, $callback) {
  LOG.d(TAG, "Executing <" + $sql + "> with parameters: " + JSON.stringify($params));

  pool.getConnection(function(err, connection) {
    connection.query($sql, $params, function($error, $rows, $fields) {
      $result = $rows;

      if($error) {
        LOG.e(TAG, $error);
      }

      if($result && $result.length > 0) {
        $result = $result.slice(0, $result.length - 1);
      }


      if($rows && $rows.length >= 1) {
        $result = $rows.shift(); //take the first element
        $result = $result[0];
      }


      connection.release();

      $callback($error, $result, $fields);
    });
  });
};

var many = function($sql, $params, $callback) {
	LOG.d(TAG, "Executing <" + $sql + "> with parameters: " + JSON.stringify($params));

  pool.getConnection(function(err, connection) {
    connection.query($sql, $params, function($error, $rows, $fields) {
      $result = $rows;

  		if($result) {
  			if($result.length > 0) {
  				$result = $result[0]; // $result.slice(0, $result.length - 1);
  			}
  		} else {
  			$result = [];
  		}

      connection.release();

      $callback($error, $result, $fields);
    });
  });
};

var insert = function($sql, $params, $callback) {
  one($sql, $params, $callback);
}

var remove = function($sql, $params, $callback) {
  one($sql, $params, $callback);
}

var update = function($sql, $params, $callback) {
  many($sql, $params, $callback);
}



exports.one = one;
exports.many = many;
exports.insert = insert;
exports.update = update;
exports.remove = remove;
