// -- IMPORT LIBRARIES
var _         = require('underscore');
var express   = require('express');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');

const TAG = 'admin.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANTS
const SQL_CREATE_USER         = "CALL R_CREATE_USER(?, ?, ?, ?, ?);";
const SQL_UPDATE_USER         = "CALL R_UPDATE_USER(?, ?, ?, ?, ?);";
const SQL_USER_BY_ID          = "CALL R_FETCH_USER_BY_ID(?,?);";
const SQL_ALL_USERS           = "CALL R_FETCH_ALL_USERS(?);";
const SQL_UNLOCK_USER         = "CALL R_UNLOCK_USER(?, ?);";
const SQL_DELETE_USER         = "CALL R_DELETE_USER(?, ?);";
const SQL_PURGE_ROLES         = "CALL R_PURGE_USER_ROLES(?, ?);";
const SQL_ASSIGN_ROLE         = "CALL R_ASSIGN_USER_ROLE(?, ?, ?);";
const SQL_ALL_USER_ROLES      = "CALL R_FETCH_ALL_USER_ROLES(?,?);";
const SQL_ALL_AVAILABLE_ROLES = "CALL R_FETCH_AVAILABLE_ROLES(?);";


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

router.get('/roles/:token', function($req, $res) {
  var $token = $req.params.token;

  db.many(SQL_ALL_AVAILABLE_ROLES, [$token], function($error, $result, $fields) {
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

  var $login      = ju.requires('login', $req.body);
  var $firstname  = ju.requires('firstname', $req.body);
  var $lastname   = ju.requires('lastname', $req.body);
  var $email      = ju.requires('email', $req.body);
  var $roles      = ju.requires('user_roles', $req.body);

  if(_.isArray($roles)) {
    if(!$roles || $roles.length <= 0) {
      throw new common.InvalidRequest();
    }


    db.one(SQL_CREATE_USER, [$login, $firstname, $lastname, $email, $token], function($error, $result, $fields) {
      if('error' in $result) {
        ju.send($req, $res, $result);
      } else {
        var $id = $result.id;

        db.one(SQL_USER_BY_ID, [$id, $token], function($error, $result, $fields) {
          $user = $result;

          db.one(SQL_PURGE_ROLES, [$id, $token], function($error, $result, $fields) {
            for($i = 0; $i < $roles.length; $i++) {
              db.one(SQL_ASSIGN_ROLE, [$id, $roles[$i], $token], function($error, $result, $fields){});
            }

            db.many(SQL_ALL_USER_ROLES, [$id, $token], function($error, $result, $fields) {
              $user['user_roles'] = $result;

              ju.send($req, $res, $user);
            });
          });
        });
      }
    });
  } else {
    throw new common.InvalidRequest();
  }
});

//UPDATE EXISTING USER
router.put('/users/:user_id/:token', function($req, $res) {
  var $token = $req.params.token;

  var $user_id    = ju.requires('user_id', $req.params)
  var $login      = ju.requires('login', $req.body);
  var $firstname  = ju.requires('firstname', $req.body);
  var $lastname   = ju.requires('lastname', $req.body);
  var $email      = ju.requires('email', $req.body);
  var $roles      = ju.requires('user_roles', $req.body);

  if(_.isArray($roles)) {
    if(!$roles || $roles.length <= 0) {
      throw new common.InvalidRequest();
    }


    db.one(SQL_UPDATE_USER, [$user_id, $firstname, $lastname, $email, $token], function($error, $result, $fields) {
      if('error' in $result) {
        ju.send($req, $res, $result);
      } else {
        var $id = $result.id;

        db.one(SQL_USER_BY_ID, [$id, $token], function($error, $result, $fields) {
          $user = $result;

          db.one(SQL_PURGE_ROLES, [$id, $token], function($error, $result, $fields) {
            for($i = 0; $i < $roles.length; $i++) {
              db.one(SQL_ASSIGN_ROLE, [$id, $roles[$i], $token], function($error, $result, $fields){});
            }

            db.many(SQL_ALL_USER_ROLES, [$id, $token], function($error, $result, $fields) {
              $user['user_roles'] = $result;

              ju.send($req, $res, $user);
            });
          });
        });
      }
    });
  } else {
    throw new common.InvalidRequest();
  }
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
const SQL_CREATE_CALENDAR_ITEM = "CALL R_ADD_CALENDAR_ITEM(?,?,?);";
const SQL_UPDATE_CALENDAR_ITEM = "CALL R_UPDATE_CALENDAR_ITEM(?,?,?,?);";
const SQL_DELETE_CALENDAR_ITEM = "CALL R_DELETE_CALENDAR_ITEM(?,?);";
const SQL_ALL_CALENDAR_ITEMS   = "CALL R_FETCH_ALL_CALENDAR_ITEMS(?,?);";
const SQL_CALENDAR_ITEM_BY_ID  = "CALL R_CALENDAR_ITEM_BY_ID(?,?);";

router.get('/calendar/year/:year/:token', function($req, $res) {
  var $token  = ju.requires('token', $req.params);

  $year = ju.requiresInt('year', $req.params);

  db.many(SQL_ALL_CALENDAR_ITEMS, [$year, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

router.get('/calendar/id/:id/:token', function($req, $res) {
  var $token  = ju.requires('token', $req.params);

  var $id = ju.requiresInt('id', $req.params);

  db.one(SQL_CALENDAR_ITEM_BY_ID, [$id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

router.post('/calendar/:token', function($req, $res) {
  var $token = $req.params.token;

  var $name = ju.requires('name', $req.body);
  var $date = ju.requires('date', $req.body);

  db.one(SQL_CREATE_CALENDAR_ITEM, [$name, $date, $token], function($error, $result, $fields) {
    if('error' in $result) {
      ju.send($req, $res, $result);
    } else {
      var $id = $result.id;

      db.one(SQL_CALENDAR_ITEM_BY_ID, [$id, $token], function($error, $result, $fields) {
        ju.send($req, $res, $result);
      });
    }
  });
});

router.put('/calendar/:id/:token', function($req, $res) {
  var $id     = ju.requiresInt('id', $req.params);
  var $token  = $req.params.token;

  var $name = ju.requires('name', $req.body);
  var $date = ju.requires('date', $req.body);

  db.one(SQL_UPDATE_CALENDAR_ITEM, [$id, $name, $date, $token], function($error, $result, $fields) {
    if('error' in $result) {
      ju.send($req, $res, $result);
    } else {
      var $id = $result.id;

      db.one(SQL_CALENDAR_ITEM_BY_ID, [$id, $token], function($error, $result, $fields) {
        ju.send($req, $res, $result);
      });
    }
  });
});

router.delete('/calendar/:id/:token', function($req, $res) {
  var $id     = ju.requiresInt('id', $req.params);
  var $token  = $req.params.token;

  db.one(SQL_DELETE_CALENDAR_ITEM, [$id, $token], function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
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
  var $id = ju.requiresInt('id', $req.params);
  var $name = ju.requires('name', $req.body);
  var $token = ju.requires('token', $req.params);

  db.one(SQL_UPDATE_INSURANCE, [$id, $name, $token], function($error, $result, $fields) {
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
