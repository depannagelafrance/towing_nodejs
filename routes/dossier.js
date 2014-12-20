// -- IMPORT LIBRARIES
require('../util/common.js');

var _         = require('underscore');
var express   = require('express');
var util      = require('util');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var LOG       = require('../util/logger.js');
var agent     = require('../util/push.js');
var dossier   = require('../model/dossier.js');
var vocab     = require('../model/vocab.js');
var settings  = require('../settings/settings.js');

var TAG = 'dossier.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANST
const SQL_CREATE_DOSSIER                    = "CALL R_CREATE_DOSSIER(?);";
const SQL_UPDATE_DOSSIER                    = "CALL R_UPDATE_DOSSIER(?, ?, ?, ?, ?, ?, ?, ?, ?);";

const SQL_CREATE_TOWING_VOUCHER             = "CALL R_CREATE_TOWING_VOUCHER(?, ?); ";
const SQL_UPDATE_TOWING_VOUCHER             = "CALL R_UPDATE_TOWING_VOUCHER(?,?,?,?,?,?,?,?,?,?,?,?,from_unixtime(?),?,?,?,from_unixtime(?), from_unixtime(?), from_unixtime(?), from_unixtime(?),from_unixtime(?), from_unixtime(?), from_unixtime(?),from_unixtime(?),?,?);";

const SQL_PURGE_DOSSIER_TRAFFIC_LANES       = "CALL R_PURGE_DOSSIER_TRAFFIC_LANES(?,?);";
const SQL_CREATE_DOSSIER_TRAFFIC_LANES      = "CALL R_CREATE_DOSSIER_TRAFFIC_LANES(?,?,?);";

const SQL_FETCH_DOSSIER_BY_ID                         = "CALL R_FETCH_DOSSIER_BY_ID(?,?)";
const SQL_FETCH_DOSSIER_BY_NUMBER                     = "CALL R_FETCH_DOSSIER_BY_NUMBER(?, ?);";
const SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER            = "CALL R_FETCH_TOWING_VOUCHERS_BY_DOSSIER(?,?)";
const SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER           = "CALL R_FETCH_TOWING_ACTIVITIES_BY_VOUCHER(?, ?, ?);";
const SQL_FETCH_TOWING_PAYMENTS_BY_VOUCHER            = "CALL R_FETCH_TOWING_PAYMENTS_BY_VOUCHER(?, ?, ?); ";
const SQL_FETCH_ALL_DOSSIERS_BY_FILTER                = "CALL R_FETCH_ALL_DOSSIERS_BY_FILTER(?,?);";
const SQL_FETCH_ALL_DOSSIERS_ASSIGNED_TO_ME_BY_FILTER = "CALL R_FETCH_ALL_DOSSIERS_ASSIGNED_TO_ME_BY_FILTER(?,?);"
const SQL_FETCH_ALL_AVAILABLE_ACTIVITIES              = "CALL R_FETCH_ALL_AVAILABLE_ACTIVITIES(?, ?, ?);";
const SQL_FETCH_ALL_VOUCHER_ACTIVITIES                = "CALL R_FETCH_ALL_TOWING_ACTIVITIES(?, ?, ?);";
const SQL_FETCH_ALL_VOUCHERS_BY_FILTER                = "CALL R_FETCH_ALL_VOUCHERS_BY_FILTER(?, ?); ";
const SQL_FETCH_ALL_ALLOTMENTS_BY_DIRECTION           = "CALL R_FETCH_ALL_ALLOTMENTS_BY_DIRECTION(?,?,?); ";
const SQL_FETCH_ALL_COMPANIES_BY_ALLOTMENT            = "CALL R_FETCH_ALL_COMPANIES_BY_ALLOTMENT(?,?); ";
const SQL_FETCH_ALL_DOSSIER_TRAFFIC_LANES             = "CALL R_FETCH_ALL_DOSSIER_TRAFFIC_LANES(?,?);";

const SQL_FETCH_TOWING_DEPOT                = "CALL R_FETCH_TOWING_DEPOT(?, ?); ";
const SQL_UPDATE_TOWING_DEPOT               = "CALL R_UPDATE_TOWING_DEPOT(?,?,?,?,?,?,?,?,?); ";

const SQL_FETCH_CUSTOMER                    = "CALL R_FETCH_TOWING_CUSTOMER(?, ?); ";
const SQL_UPDATE_TOWING_CUSTOMER            = "CALL R_UPDATE_TOWING_CUSTOMER(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";

const SQL_FETCH_CAUSER                      = "CALL R_FETCH_TOWING_CAUSER(?, ?); ";
const SQL_UPDATE_TOWING_CAUSER              = "CALL R_UPDATE_TOWING_CAUSER(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";

const SQL_UPDATE_TOWING_VOUCHER_ACTIVITY    = "CALL R_UPDATE_TOWING_VOUCHER_ACTIVITY(?,?,?,?);";
const SQL_REMOVE_TOWING_VOUCHER_ACTIVITY    = "CALL R_REMOVE_TOWING_VOUCHER_ACTIVITY(?,?,?);";
const SQL_UPDATE_TOWING_VOUCHER_PAYMENTS    = "CALL R_UPDATE_TOWING_VOUCHER_PAYMENTS(?,?,?,?,?,?,?,?);";

const SQL_ADD_COLLECTOR_SIGNATURE   = "CALL R_ADD_COLLECTOR_SIGNATURE(?,?,?,?,?);";
const SQL_ADD_CAUSER_SIGNATURE      = "CALL R_ADD_CAUSER_SIGNATURE(?,?,?,?,?);";
const SQL_ADD_POLICE_SIGNATURE      = "CALL R_ADD_POLICE_SIGNATURE(?,?,?,?,?);";
const SQL_ADD_INSURANCE_DOCUMENT    = "CALL R_ADD_INSURANCE_DOCUMENT(?,?,?,?,?,?);";

const SQL_FETCH_ALL_INTERNAL_COMMUNICATION = "CALL R_FETCH_ALL_INTERNAL_COMMUNICATIONS(?,?,?); ";
const SQL_FETCH_ALL_EMAIL_COMMUNICATION    = "CALL R_FETCH_ALL_EMAIL_COMMUNICATIONS(?,?,?); ";
const SQL_FETCH_ALL_EMAIL_RECIPIENTS       = "CALL R_FETCH_ALL_DOSSIER_COMM_RECIPIENTS(?,?); ";
const SQL_ADD_DOSSIER_COMMUNICATION        = "CALL R_CREATE_DOSSIER_COMMUNICATION(?,?,?,?,?,?); ";
const SQL_ADD_DOSSIER_COMM_RECIPIENT       = "CALL R_CREATE_DOSSIER_COMM_RECIPIENT(?, ?, ?, ?); ";

const SQL_FETCH_USER_BY_ID                 = "CALL R_FETCH_USER_BY_ID(?,?);";

const STATUS_NEW                = "NEW";
const STATUS_IN_PROGRESS        = "IN PROGRESS";
const STATUS_COMPLETED          = "COMPLETED";
const STATUS_TO_CHECK           = "TO CHECK";
const STATUS_READY_FOR_INVOICE  = "READY FOR INVOICE";


var listDossiers = function($req, $res, $status) {
  var $token = ju.requires('token', $req.params);

  //fetch the towing activities information
  db.many(SQL_FETCH_ALL_DOSSIERS_BY_FILTER, [$status, $token], function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
}

//-- FETCH THE DOSSIERS
router.get('/:token', function($req, $res) {
  listDossiers($req, $res, STATUS_NEW);
});

router.get('/list/new/:token', function($req, $res) {
  listDossiers($req, $res, STATUS_NEW);
});

//overview of dossiers/vouchers assigned to current user
router.get('/list/me/:token', function($req, $res) {
  var $token = ju.requires('token', $req.params);

  //fetch the towing activities information
  db.many(SQL_FETCH_ALL_DOSSIERS_ASSIGNED_TO_ME_BY_FILTER, [STATUS_NEW, $token], function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
});

router.get('/list/check/:token', function($req, $res) {
  listDossiers($req, $res, STATUS_TO_CHECK);
});

router.get('/list/invoice/:token', function($req, $res) {
  listDossiers($req, $res, STATUS_READY_FOR_INVOICE);
});

router.get('/list/done/:token', function($req, $res) {
  listDossiers($req, $res, STATUS_COMPLETED);
});

router.get('/list/vouchers/new/:token', function($req, $res) {
  var $token = ju.requires('token', $req.params);

  db.many(SQL_FETCH_ALL_VOUCHERS_BY_FILTER, [STATUS_NEW, $token], function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
});

router.get('/list/vouchers/completed/:token', function($req, $res) {
  var $token = ju.requires('token', $req.params);

  db.many(SQL_FETCH_ALL_VOUCHERS_BY_FILTER, [STATUS_COMPLETED, $token], function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
});

router.get('/list/available_activities/:dossier/:voucher/:token', function($req, $res) {
  var $dossier_id = ju.requiresInt('dossier', $req.params);
  var $voucher    = ju.requiresInt('voucher', $req.params);
  var $token      = ju.requires('token', $req.params);

  //fetch the towing activities information
  db.many(SQL_FETCH_ALL_AVAILABLE_ACTIVITIES, [$dossier_id, $voucher, $token], function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
});

router.get('/list/activities/:dossier/:voucher/:token', function($req, $res) {
  var $dossier_id = ju.requiresInt('dossier', $req.params);
  var $voucher    = ju.requiresInt('voucher', $req.params);
  var $token      = ju.requires('token', $req.params);

  //fetch the towing activities information
  db.many(SQL_FETCH_ALL_VOUCHER_ACTIVITIES, [$dossier_id, $voucher, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

router.get('/list/available_allotments/direction/:direction/:token', function($req, $res) {
  var $direction  = ju.requiresInt('direction', $req.params);
  var $token      = ju.requires('token', $req.params);

  db.many(SQL_FETCH_ALL_ALLOTMENTS_BY_DIRECTION, [$direction, null, $token], function($error, $result, $fields) {
      if($result && !('error' in $result) && $result.length > 0)
      {
        $allotments = [];

        $result.forEach(function($allotment) {
          db.many(SQL_FETCH_ALL_COMPANIES_BY_ALLOTMENT, [$allotment.id, $token], function($error, $a_result, $fields) {
            $allotment.towing_services = $a_result;

            $allotments.push($allotment);

            if($allotments.length == $result.length) {
              ju.send($req, $res, $allotments);
            }
          });
        });
      }
      else
      {
        ju.send($req, $res, $result);
      }
  });
});

router.get('/list/available_allotments/direction/:direction/indicator/:indicator/:token', function($req, $res) {
  var $direction  = ju.requiresInt('direction', $req.params);
  var $indicator  = $req.params.indicator;
  var $token      = ju.requires('token', $req.params);

  db.many(SQL_FETCH_ALL_ALLOTMENTS_BY_DIRECTION, [$direction, $indicator, $token], function($error, $result, $fields) {
    if($result && !('error' in $result) && $result.length > 0)
    {
      $allotments = [];


      $result.forEach(function($allotment) {
        db.many(SQL_FETCH_ALL_COMPANIES_BY_ALLOTMENT, [$allotment.id, $token], function($error, $a_result, $fields) {
          $allotment.towing_services = $a_result;

          $allotments.push($allotment);

          if($allotments.length == $result.length) {
            ju.send($req, $res, $allotments);
          }
        });
      });
    }
    else
    {
      ju.send($req, $res, $result);
    }
  });
});

router.get('/list/traffic_posts/allotment/:allotment_id/:token', function($req, $res) {
  var $allotment_id = ju.requiresInt('allotment_id', $req.params);
  var $token        = ju.requires('token', $req.params);

  vocab.findAllTrafficPostsByAllotment($allotment_id, $token, function($result){
    ju.send($req, $res, $result);
  });
});

router.get('/list/traffic_lanes/:dossier_id/:token', function($req, $res) {
  var $dossier_id = ju.requiresInt('dossier_id', $req.params);
  var $token = ju.requires('token', $req.params);

  db.many(SQL_FETCH_ALL_DOSSIER_TRAFFIC_LANES, [$dossier_id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});


// -- GET A DOSSIER BY ID
function fetchDossierById($req, $res, $dossier_id, $token) {
  dossier.findById($dossier_id, $token, function($dossier) {
    ju.send($req, $res, {'dossier': $dossier});
  });
}

router.get('/:dossier/:token', function($req, $res) {
  $dossier_id = $req.params.dossier;
  $token = $req.params.token;

  fetchDossierById($req, $res, $dossier_id, $token);
});


router.get('/find/dossier_number/:dossier/:token', function($req, $res) {
  var $dossier_nr = ju.requiresInt('dossier', $req.params);
  var $token      = ju.requires('token', $req.params);

  //fetch the towing activities information
  db.one(SQL_FETCH_DOSSIER_BY_NUMBER, [$dossier_nr, $token], function($error, $result, $fields) {
      if('error' in $result) {
        ju.send($req, $res, $result);
      } else {
        fetchDossierById($req, $res, $result.id, $token);
      }
  });
});

// -- CREATE DOSSIER, TOWING VOUCHER
router.post('/:token', function($req, $res) {
  $token  = ju.requires('token', $req.params);

  db.one(SQL_CREATE_DOSSIER, [$token], function($error, $result, $fields) {
    if($result && 'error' in $result) {
      ju.send($req, $res, $result);
    } else {
      fetchDossierById($req, $res, $result.id, $token);
    }
  });
});

// -- CREATE VOUCHER
router.post('/voucher/:dossier_id/:token', function($req, $res) {
  $dossier_id = ju.requiresInt('dossier_id', $req.params);
  $token  = ju.requires('token', $req.params);

  db.one(SQL_CREATE_TOWING_VOUCHER, [$dossier_id, $token], function($error, $result, $fields) {
    if($result && 'error' in $result) {
      ju.send($req, $res, $result);
    } else {
      fetchDossierById($req, $res, $dossier_id, $token);
    }
  });
});

// -- CREATE VOUCHER ATTACHMENT
router.post('/voucher/attachment/:category/:voucher_id/:token', function($req, $res) {
  $voucher_id = ju.requiresInt('voucher_id', $req.params);
  $token      = ju.requires('token', $req.params);
  $category   = ju.requires('category', $req.params);
  $file_name  = "";

  $sql = "";

  //validate incomming category
  switch($category) {
    case 'signature_police':
      $sql = SQL_ADD_POLICE_SIGNATURE; break;
    case 'signature_collector':
      $sql = SQL_ADD_COLLECTOR_SIGNATURE; break;
    case 'signature_causer':
      $sql = SQL_ADD_CAUSER_SIGNATURE; break;
    case 'insurance_document':
      $sql = SQL_ADD_INSURANCE_DOCUMENT;
      $filename = ju.requires('file_name', $req.body);
      break;
    default:
      throw new common.InvalidRequest();
  }

  $content_type = ju.requires('content_type', $req.body);
  $file_size    = ju.requiresInt('file_size', $req.body);
  $content      = ju.requires('content', $req.body);


  $params = [$voucher_id, $content_type, $file_size, $content, $token];

  if($file_name && $file_name != "" && $category == 'insurance_document') {
    $params = [$voucher_id, $file_name, $content_type, $file_size, $content, $token];
  }

  //insert object
  db.one($sql, $params, function($error, $result, $fields) {
      ju.send($req, $res, $result);
  });
});

// -----------------------------------------------------------------------------
// REMOVE AN ACTIVITY FROM A VOUCHER
//  * voucher_id (required), the voucher id
//  * activity_id (required), the id of the activity to remove
//  * token (required), the token of the current session
// -----------------------------------------------------------------------------
router.delete('/voucher/:voucher_id/activity/:activity_id/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);
  var $activity_id  = ju.requiresInt('activity_id', $req.params);
  var $voucher_id   = ju.requiresInt('voucher_id', $req.params);

  db.one(SQL_REMOVE_TOWING_VOUCHER_ACTIVITY, [$voucher_id, $activity_id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});


router.get('/depot/:dossier/:voucher/:token', function($req, $res) {
  $dossier_id       = ju.requiresInt('dossier', $req.params);
  $voucher_id       = ju.requiresInt('voucher', $req.params);
  $token            = ju.requires('token', $req.params);


  db.one(SQL_FETCH_TOWING_DEPOT, [$voucher_id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

router.put('/depot/:dossier/:voucher/:token', function($req, $res) {
  $dossier_id       = ju.requiresInt('dossier', $req.params);
  $voucher_id       = ju.requiresInt('voucher', $req.params);
  $token            = ju.requires('token', $req.params);

  $depot = ju.requires('depot', $req.body);

  //upate the voucher's depot if it is available
  if($depot.id) {
    $_depot = $depot;

    $params = [$_depot.id, $voucher_id, $_depot.name, $_depot.street, $_depot.street_number,
               $_depot.street_pobox, $_depot.zip, $_depot.city, $token];

    db.one(SQL_UPDATE_TOWING_DEPOT, $params, function($error, $result, $fields){
      if($result && 'id' in $result) {
        ju.send($req, $res, $depot);
      } else {
        ju.send($req, $res, $result);
      }
    });
  }
});

router.get('/causer/:dossier/:voucher/:token', function($req, $res) {
  $dossier_id       = ju.requiresInt('dossier', $req.params);
  $voucher_id       = ju.requiresInt('voucher', $req.params);
  $token            = ju.requires('token', $req.params);

  db.one(SQL_FETCH_CAUSER, [$voucher_id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

router.put('/causer/:dossier/:voucher/:token', function($req, $res) {
  $dossier_id       = ju.requiresInt('dossier', $req.params);
  $voucher_id       = ju.requiresInt('voucher', $req.params);
  $token            = ju.requires('token', $req.params);

  $_causer = ju.requires('causer', $req.body);

  if($_causer && $_causer.id) {
    $_customer = $_causer;

    $params = [$_customer.id, $voucher_id,
               $_customer.first_name, $_customer.last_name, $_customer.company_name, $_customer.company_vat,
               $_customer.street, $_customer.street_number, $_customer.street_pobox,
               $_customer.zip, $_customer.city, $_customer.country,
               $_customer.phone, $_customer.email,
               $token];

    db.one(SQL_UPDATE_TOWING_CAUSER, $params, function($error, $result, $fields){
      if($result && 'id' in $result) {
        ju.send($req, $res, $_causer);
      } else {
        ju.send($req, $res, $result);
      }
    });
  }
});

router.get('/customer/:dossier/:voucher/:token', function($req, $res) {
  $dossier_id       = ju.requiresInt('dossier', $req.params);
  $voucher_id       = ju.requiresInt('voucher', $req.params);
  $token            = ju.requires('token', $req.params);

  db.one(SQL_FETCH_CUSTOMER, [$voucher_id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  })
});

router.put('/customer/:dossier/:voucher/:token', function($req, $res) {
  $dossier_id       = ju.requiresInt('dossier', $req.params);
  $voucher_id       = ju.requiresInt('voucher', $req.params);
  $token            = ju.requires('token', $req.params);

  $_customer = ju.requires('customer', $req.body);

  if($_customer && $_customer.id) {

    $params = [$_customer.id, $voucher_id,
               $_customer.first_name, $_customer.last_name, $_customer.company_name, $_customer.company_vat,
               $_customer.street, $_customer.street_number, $_customer.street_pobox,
               $_customer.zip, $_customer.city, $_customer.country,
               $_customer.phone, $_customer.email,
               $_customer.invoice_ref,
               $token];

    db.one(SQL_UPDATE_TOWING_CUSTOMER, $params, function($error, $result, $fields){
      if($result && 'id' in $result) {
        ju.send($req, $res, $_customer);
      } else {
        ju.send($req, $res, $result);
      }
    });
  }
});



// -- UPDATE DOSSIER RELATED INFORMATION
router.put('/:dossier/:token', function($req, $res) {
  $dossier_id       = ju.requiresInt('dossier', $req.params);
  $token            = ju.requires('token', $req.params);

  $dossier          = ju.requires('dossier', $req.body);

  //dossier fields
  $call_number      = ju.requires('call_number', $dossier);
  $company_id       = ju.requiresInt('company_id', $dossier);
  $incident_type_id = ju.requiresInt('incident_type_id', $dossier);
  $allotment_id     = ju.requiresInt('allotment_id', $dossier);
  $direction_id     = ju.requiresInt(['direction_id', 'allotment_direction_id'], $dossier);
  $indicator_id     = ju.requiresInt(['indicator_id', 'allotment_direction_indicator_id'], $dossier);
  $traffic_lanes    = $dossier.traffic_lanes;
  $traffic_post_id  = $dossier.police_traffic_post_id;

  $vouchers         = ju.requires('towing_vouchers', $dossier);


  $params = [$dossier_id, $call_number, $company_id, $incident_type_id, $allotment_id, $direction_id, $indicator_id, $traffic_post_id, $token];

  db.one(SQL_UPDATE_DOSSIER, $params, function($error, $result, $fields) {
    if($result && 'error' in $result) {
      ju.send($req, $res, $result);
    } else {
      db.one(SQL_PURGE_DOSSIER_TRAFFIC_LANES, [$dossier_id, $token], function($error, $result, fields) {
        if($traffic_lanes)
        {
          $traffic_lanes.forEach(function($traffic_lane) {
            var $traffic_lane_id = null;
            if(_.isObject($traffic_lane)) {
              if($traffic_lane.selected)
                $traffic_lane_id = $traffic_lane.id;
            } else {
              $traffic_lane_id = $traffic_lane;
            }

            if($traffic_lane_id)
            {
              db.one(SQL_CREATE_DOSSIER_TRAFFIC_LANES, [$dossier_id, $traffic_lane_id, $token], function($error, $result, $fields) {
                //fire and forget
              });
            }
          });
        }
      });

      $i = 0;

      if(!$vouchers || $vouchers.length == 0) {
        fetchDossierById($req, $res, $result.id, $token);
      } else {
        $vouchers.forEach(function($voucher) {
          $voucher_id               = $voucher.id;
          $insurance_id             = ($voucher.insurance_id == "" ? null : $voucher.insurance_id);
          $insurance_dossier_nr     = $voucher.insurance_dossiernr;
          $warranty_holder          = $voucher.insurance_warranty_held_by;
          $collector_id             = ($voucher.collector_id == "" ? null : $voucher.collector_id);
          $police_signature_date    = _.isNaN(parseFloat($voucher.police_signature_dt)) ? null : parseFloat($voucher.police_signature_dt);
          $recipient_signature_date = _.isNaN(parseFloat($voucher.recipient_signature_dt)) ? null : parseFloat($voucher.recipient_signature_dt);
          $vehicule_type            = $voucher.vehicule_type;
          $vehicule_licence_plate   = $voucher.vehicule_licenceplate;
          $vehicule_country         = $voucher.vehicule_country;
          $vehicule_collected       = _.isNaN(parseFloat($voucher.vehicule_collected)) ? null : parseFloat($voucher.vehicule_collected);
          $towing_id                = $voucher.towing_id ? $voucher.towing_id : null;
          $towed_by                 = $voucher.towed_by;
          $towed_by_vehicule        = $voucher.towed_by_vehicle;
          $towing_called            = _.isNaN(parseFloat($voucher.towing_called)) ? null : parseFloat($voucher.towing_called);
          $towing_arrival           = _.isNaN(parseFloat($voucher.towing_arrival)) ? null : parseFloat($voucher.towing_arrival);
          $towing_start             = _.isNaN(parseFloat($voucher.towing_start)) ? null : parseFloat($voucher.towing_start);
          $towing_completed         = _.isNaN(parseFloat($voucher.towing_completed)) ? null : parseFloat($voucher.towing_completed);
          $signa_id                 = $voucher.signa_id ? $voucher.signa_id : null;
          $signa_by                 = $voucher.signa_by;
          $signa_by_vehicule        = $voucher.signa_by_vehicle;
          $signa_arrival            = _.isNaN(parseFloat($voucher.signa_arrival)) ? null : parseFloat($voucher.signa_arrival);
          $cic                      = _.isNaN(parseFloat($voucher.cic)) ? null : parseFloat($voucher.cic);
          $additional_info          = $voucher.additional_info;

          $actions                  = $voucher.actions;

          //upate the voucher's depot if it is available
          if($voucher.depot && $voucher.depot.id) {
            $_depot = $voucher.depot;

            $params = [$_depot.id, $voucher_id, $_depot.name, $_depot.street, $_depot.street_number,
                       $_depot.street_pobox, $_depot.zip, $_depot.city, $token];

            db.one(SQL_UPDATE_TOWING_DEPOT, $params, function($error, $result, $fields){
              //fire and forget!
            });
          }

          if($voucher.causer && $voucher.causer.id) {
            $_customer = $voucher.causer;

            $params = [$_customer.id, $voucher_id,
                       $_customer.first_name, $_customer.last_name, $_customer.company_name, $_customer.company_vat,
                       $_customer.street, $_customer.street_number, $_customer.street_pobox,
                       $_customer.zip, $_customer.city, $_customer.country,
                       $_customer.phone, $_customer.email,
                       $token];

            db.one(SQL_UPDATE_TOWING_CAUSER, $params, function($error, $result, $fields){
              //fire and forget!
            });
          }

          if($voucher.customer && $voucher.customer.id) {
            $_customer = $voucher.customer;

            $params = [$_customer.id, $voucher_id,
                       $_customer.first_name, $_customer.last_name, $_customer.company_name, $_customer.company_vat,
                       $_customer.street, $_customer.street_number, $_customer.street_pobox,
                       $_customer.zip, $_customer.city, $_customer.country,
                       $_customer.phone, $_customer.email,
                       $_customer.invoice_ref,
                       $token];

            db.one(SQL_UPDATE_TOWING_CUSTOMER, $params, function($error, $result, $fields){
              //fire and forget!
            });
          }

          if($voucher.towing_activities) {
            $voucher.towing_activities.forEach(function($activity) {
              db.one(SQL_UPDATE_TOWING_VOUCHER_ACTIVITY, [$voucher_id, $activity.activity_id, $activity.amount, $token], function($error, $result, $fields) {
                //fire and forget
              });
            });
          }

          if($voucher.towing_payments) {
            var $vtp = $voucher.towing_payments;

            db.one(SQL_UPDATE_TOWING_VOUCHER_PAYMENTS, [$dossier_id, $voucher_id, $vtp.amount_guaranteed_by_insurance,
                                                        $vtp.paid_in_cash, $vtp.paid_by_bank_deposit, $vtp.paid_by_debit_card,
                                                        $vtp.paid_by_credit_card, $token], function($error, $result, $fields) {
              //fire and forget
            });
          }

          $params = [$dossier_id, $voucher_id, $insurance_id, $insurance_dossier_nr,
                     $warranty_holder, $collector_id, $vehicule_type,
                     $vehicule_licence_plate, $vehicule_country,
                     $signa_id, $signa_by, $signa_by_vehicule, $signa_arrival,
                     $towing_id, $towed_by, $towed_by_vehicule,
                     $towing_called, $towing_arrival, $towing_start,
                     $towing_completed, $police_signature_date, $recipient_signature_date,
                     $vehicule_collected, $cic, $additional_info, $token];


          if($actions && ($signa_id && $signa_id.trim() != ''))
          {
            if($actions.signa_send_notification && $actions.signa_send_notification == 1)
            {
              LOG.d(TAG, " =============================================== ");
              LOG.d(TAG, "  > Sending a notification")
              LOG.d(TAG, " =============================================== ");

              db.one(SQL_FETCH_USER_BY_ID, [$signa_id, $token], function($error, $result, $fields) {
                if($result)
                {
                  agent.createMessage()
                        .device('<edd14b0e f7980538 2e44ed6c 250d57e8 1e00c5b6 e924a013 9d67ef51 c741dbc0>')
                        .alert('Nieuwe takelbon beschikbaar!')
                        .set('ACTION', 'NEW_TOWING_VOUCHER_ASSIGNED')
                        .send();
                }
              });

            }
          }

          db.one(SQL_UPDATE_TOWING_VOUCHER, $params, function($error, $result, $fields){
            if(++$i == $vouchers.length) {
              fetchDossierById($req, $res, $dossier_id, $token);
            }
          });
        });
      }
    }
  });
});

// -----------------------------------------------------------------------------
// DOSSIER COMMUNICATIONS
// -----------------------------------------------------------------------------

router.get('/communication/:type/:dossier/:voucher/:token', function($req, $res) {
  var $token      = ju.requires('token', $req.params);
  var $type       = ju.requires('type', $req.params);
  var $dossier_id = ju.requiresInt('dossier', $req.params);
  var $voucher_id = ju.intValueOf('voucher', $req.params);


  var $params = [$dossier_id, $voucher_id, $token];

  switch($type) {
    case 'email':
      db.many(SQL_FETCH_ALL_EMAIL_COMMUNICATION, $params, function($error, $result, $fields) {
          if($result.length > 0  && !('error' in $result)) {
            $comms = [];

            $result.forEach(function($item) {
              db.many(SQL_FETCH_ALL_EMAIL_RECIPIENTS, [$item.id, $token], function($error, $r_result, $fields) {
                  $item.recipients = $r_result;

                  $comms.push($item);

                  if($comms.length >= $result.length) {
                    ju.send($req, $res, $comms);
                  }
              });
            });
          } else {
            ju.send($req, $res, $result);
          }
      });

      break;
    case 'internal':
      db.many(SQL_FETCH_ALL_INTERNAL_COMMUNICATION, $params, function($error, $result, $fields) {
          ju.send($req, $res, $result);
      });

      break;
    default:
      throw new common.InvalidRequest();
  }
});

router.post('/communication/:type/:token', function($req, $res) {
  var $token      = ju.requires('token', $req.params);
  var $type       = ju.requires('type', $req.params);

  var $dossier_id = ju.requiresInt('dossier_id', $req.body);
  var $voucher_id = ju.intValueOf('voucher_id', $req.body);
  var $message    = ju.requires('message', $req.body);

  switch($type) {
    case 'email':
      $subject    = ju.requires('subject', $req.body);
      $recipients = ju.requires('recipients', $req.body);

      $params = [$dossier_id, $voucher_id, 'EMAIL', $subject, $message, $token];

      db.one(SQL_ADD_DOSSIER_COMMUNICATION, $params, function($error, $result, $fields) {
          if($result && $result.status == 'OK') {
              $recipients.forEach(function($recipient) {
                db.one(SQL_ADD_DOSSIER_COMM_RECIPIENT, [$result.communication_id, $recipient.type, $recipient.email, $token], function($error, $result, $fields) {
                  //fire and forget
                });
              });
          }

          ju.send($req, $res, $result);
      });

      break;
    case 'internal':
      $params = [$dossier_id, $voucher_id, 'INTERNAL', null, $message, $token];

      db.one(SQL_ADD_DOSSIER_COMMUNICATION, $params, function($error, $result, $fields) {
          ju.send($req, $res, $result);
      });

      break;
    default:
      throw new common.InvalidRequest();
  }
});

router.post('/signature/:type/:dossier/:voucher/:token', function($req,$res) {
  var $voucher_id = ju.requiresInt('voucher', $req.params);
  var $dossier_id = ju.requiresInt('dossier', $req.params);
  var $token      = ju.requires('token', $req.params);
  var $type       = ju.requiresEnum('type', $req.params, ['collector', 'causer', 'police']);

  var $message = "";

  switch($type) {
    case 'collector': $message = 'Aanvraag voor handtekening ophaler'; break;
    case 'causer': $message = 'Aanvraag voor handtekening hinderverwerkker'; break;
    case 'police': $message = 'Aanvraag voor handtekening politie'; break;
  }

  agent.createMessage()
        .device(settings.apns.default_device)
        .alert($message)
        .set('ACTION', 'COLLECTOR_SIGNATURE')
        .set('voucher_id', $voucher_id)
        .set('dossier_id', $dossier_id)
        .set('type', $type)
        .send();

  ju.send($req, $res, {'result': 'ok'});
});


module.exports = router;
