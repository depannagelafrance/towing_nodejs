// -- IMPORT LIBRARIES
var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');

const TAG = 'admin.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANST
const SQL_CREATE_USER         = "CALL R_CREATE_USER(?, ?, ?, ?, ?);";
const SQL_USER_BY_ID          = "CALL R_FETCH_USER_BY_ID(?,?);";
const SQL_ALL_USERS           = "CALL R_FETCH_ALL_USERS(?);";
const SQL_UNLOCK_USER         = "CALL R_UNLOCK_USER(?, ?);";
const SQL_DELETE_USER         = "CALL R_DELETE_USER(?, ?);";


// -- ONLY POSTS ARE ALLOWED
router.get('/', function($req, $res) {
  throw new common.InvalidRequest();
});

// -- PROCESS LOGIN
router.post('/', function($req, $res) {
    throw new common.InvalidRequest();
});

// -- -------------------------------------------------
// -- USER MANAGEMENT
// -- -------------------------------------------------
// FETCH OVERVIEW OF USERS
router.get('/users/:token', function($req,$res) {
  var $token = $req.params.token;

  db.many(SQL_ALL_USERS, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

//FETCH INFORMATION OF A SPECIFIC USER
router.get('/users/:user_id/:token', function($req, $res) {
  var $id = $req.params.user_id;
  var $token = $req.params.token;

  db.one(SQL_USER_BY_ID, [$id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

//CREATE NEW USER
router.post('/users/:token', function($req, $res) {
  var $token = $req.params.token;

  var $login = ju.requires('login', $req.body);
  var $firstname = ju.requires('firstname', $req.body);
  var $lastname = ju.requires('lastname', $req.body);
  var $email = ju.requires('email', $req.body);

  db.one(SQL_CREATE_USER, [$login, $firstname, $lastname, $email, $token], function($error, $result, $fields) {
    if('error' in $result) {
      ju.send($req, $res, $result);
    } else {
      var $id = $result.id;

      db.one(SQL_USER_BY_ID, [$id, $token], function($error, $result, $fields) {
        ju.send($req, $res, $result);
      });
    }
  });
});

//UPDATE EXISTING USER
router.put('/users/:user_id/:token', function($req, $res) {

});

//DELETE USER
router.delete('/users/:user_id/:token', function($req, $res) {
  var $id = $req.params.user_id;
  var $token = $req.params.token;

  db.one(SQL_DELETE_USER, [$id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

//REACTIVATE USER
router.put('/users/reactivate/:user_id/:token', function($req, $res) {
  ju.send($req, $res, {"statusCode": 500, "message": "Missing Implementation"});
});

//UNLOCK A TEMPORARILY LOCKED USER
router.put('/users/unlock/:user_id/:token', function($req, $res) {
  var $id = $req.params.user_id;
  var $token = $req.params.token;

  db.one(SQL_UNLOCK_USER, [$id, $token], function($error, $result, $fields) {
    if('error' in $result) {
      ju.send($req, $res, $result);
    } else {
      db.one(SQL_USER_BY_ID, [$id, $token], function($error, $result, $fields) {
        ju.send($req, $res, $result);
      });
    }
  });
});

// -- -------------------------------------------------
// -- CALENDAR MANAGEMENT
// -- -------------------------------------------------
// FETCH CALENDAR ITEMS
router.get('/calendar/:year/:token', function($req, $res) {

});

router.post('/calendar/:token', function($req, $res) {

});

router.put('/calendar/:id/:token', function($req, $res) {

});

router.delete('/calendar/:id/:token', function($req, $res) {

});



// -- -------------------------------------------------
// -- INSURANCE MANAGEMENT
// -- -------------------------------------------------
const SQL_ALL_INSURANCES    = "CALL R_FETCH_ALL_INSURANCES(?);";
const SQL_INSURANCE_BY_ID   = "CALL R_FETCH_INSURANCE_BY_ID(?,?);";
const SQL_CREATE_INSURANCE  = "CALL R_ADD_INSURANCE(?,?);";
const SQL_UPDATE_INSURANCE  = "CALL R_UPDATE_INSURANCE(?,?,?);";
const SQL_DELETE_INSURANCE  = "CALL R_DELETE_INSURANCE(?,?);";

router.get('/insurance/:token', function($req, $res) {
  var $token = $req.params.token;

  console.log($token + " was found");

  db.many(SQL_ALL_INSURANCES, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

router.get('/insurance/:id/:token', function($req, $res) {
  var $id = $req.params.id;
  var $token = $req.params.token;

  db.one(SQL_INSURANCE_BY_ID, [$id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

router.post('/insurance/:token', function($req, $res) {
  var $token = $req.params.token;

  var $name = ju.requires('name', $req.body);

  db.one(SQL_CREATE_INSURANCE, [$name, $token], function($error, $result, $fields) {
    if('error' in $result) {
      ju.send($req, $res, $result);
    } else {
      var $id = $result.id;

      db.one(SQL_INSURANCE_BY_ID, [$id, $token], function($error, $result, $fields) {
        ju.send($req, $res, $result);
      });
    }
  });
});

router.put('/insurance/:id/:token', function($req, $res) {
  var $id = $req.params.id;
  var $token = $req.params.token;

  db.one(SQL_UPDATE_INSURANCE, [$id, $token], function($error, $result, $fields) {
    if('error' in $result) {
      ju.send($req, $res, $result);
    } else {
      db.one(SQL_INSURANCE_BY_ID, [$id, $token], function($error, $result, $fields) {
        ju.send($req, $res, $result);
      });
    }
  });
});

router.delete('/insurance/:id/:token', function($req, $res) {
  var $id = $req.params.id;
  var $token = $req.params.token;

  db.one(SQL_DELETE_INSURANCE, [$id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

// -- -------------------------------------------------
// -- COLLECTOR MANAGEMENT
// -- -------------------------------------------------

const SQL_ALL_COLLECTORS    = "CALL R_FETCH_ALL_COLLECTORS(?);";
const SQL_COLLECTOR_BY_ID   = "CALL R_FETCH_COLLECTOR_BY_ID(?,?);";
const SQL_CREATE_COLLECTOR  = "CALL R_ADD_COLLECTOR(?,?);";
const SQL_UPDATE_COLLECTOR  = "CALL R_UPDATE_COLLECTOR(?,?,?);";
const SQL_DELETE_COLLECTOR  = "CALL R_DELETE_COLLECTOR(?,?);";

router.get('/collector/:token', function($req, $res) {
  var $token = $req.params.token;

  db.many(SQL_ALL_COLLECTORS, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

router.get('/collector/:id/:token', function($req, $res) {
  var $id = $req.params.id;
  var $token = $req.params.token;

  db.one(SQL_COLLECTOR_BY_ID, [$id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

router.post('/collector/:token', function($req, $res) {
  var $token = $req.params.token;

  var $name = ju.requires('name', $req.body);

  db.one(SQL_CREATE_COLLECTOR, [$name, $token], function($error, $result, $fields) {
    if('error' in $result) {
      ju.send($req, $res, $result);
    } else {
      var $id = $result.id;

      db.one(SQL_COLLECTOR_BY_ID, [$id, $token], function($error, $result, $fields) {
        ju.send($req, $res, $result);
      });
    }
  });
});

router.put('/collector/:id/:token', function($req, $res) {
  var $id = $req.params.id;
  var $token = $req.params.token;

  db.one(SQL_UPDATE_COLLECTOR, [$id, $token], function($error, $result, $fields) {
    if('error' in $result) {
      ju.send($req, $res, $result);
    } else {
      db.one(SQL_COLLECTOR_BY_ID, [$id, $token], function($error, $result, $fields) {
        ju.send($req, $res, $result);
      });
    }
  });
});

router.delete('/collector/:id/:token', function($req, $res) {
  var $id = $req.params.id;
  var $token = $req.params.token;

  db.one(SQL_DELETE_COLLECTOR, [$id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});




module.exports = router;
