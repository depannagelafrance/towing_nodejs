
var db        = require('../util/database.js');
var LOG       = require('../util/logger.js');

var TAG = 'model/dossier.js';

const SQL_FETCH_DOSSIER_BY_ID               = "CALL R_FETCH_DOSSIER_BY_ID(?,?)";
const SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER  = "CALL R_FETCH_TOWING_VOUCHERS_BY_DOSSIER(?,?)";
const SQL_FETCH_TOWING_PAYMENTS_BY_VOUCHER  = "CALL R_FETCH_TOWING_PAYMENTS_BY_VOUCHER(?, ?, ?); ";

const SQL_FETCH_TOWING_DEPOT                = "CALL R_FETCH_TOWING_DEPOT(?, ?); ";

const SQL_FETCH_CUSTOMER                    = "CALL R_FETCH_TOWING_CUSTOMER(?, ?); ";
const SQL_FETCH_CAUSER                      = "CALL R_FETCH_TOWING_CAUSER(?, ?); ";
const SQL_FETCH_TOWING_COMPANY              = "CALL R_FETCH_TOWING_COMPANY_BY_DOSSIER(?, ?); ";

const SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER = "CALL R_FETCH_TOWING_ACTIVITIES_BY_VOUCHER(?, ?, ?);";


var findById = function($dossier_id, $token, cb) {
  var $dossier = {};

  db.one(SQL_FETCH_DOSSIER_BY_ID, [$dossier_id, $token], function($error, $d_result, $fields) {
    $dossier = $d_result;

    //set the selected towing company
    db.one(SQL_FETCH_TOWING_COMPANY, [$dossier_id, $token], function($error, $t_result, $fields){
        $dossier.towing_company = $t_result;
    });

    db.many(SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER, [$dossier_id, $token],function($error, $v_result, $fields) {
      $vouchers = [];

      $v_result.forEach(function($voucher) {
        //fetch the towing payments information
        db.one(SQL_FETCH_TOWING_PAYMENTS_BY_VOUCHER, [$dossier_id, $voucher.id, $token], function($error, $p_result, $fields) {
            $voucher.towing_payments = $p_result;
        });

        //towing depot
        db.one(SQL_FETCH_TOWING_DEPOT, [$voucher.id, $token], function($error, $t_result, $fields){
            $voucher.depot = $t_result;
        });

        //towing customer
        db.one(SQL_FETCH_CUSTOMER, [$voucher.id, $token], function($error, $t_result, $fields){
            $voucher.customer = $t_result;
        });

        //towing causer
        db.one(SQL_FETCH_CAUSER, [$voucher.id, $token], function($error, $t_result, $fields){
            $voucher.causer = $t_result;
        });

        //fetch the towing activities information
        db.many(SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER, [$dossier_id, $voucher.id, $token], function($error, $a_result, $fields) {
          $voucher.towing_activities = $a_result;

          $vouchers.push($voucher);

          if($vouchers.length == $v_result.length) {
            $dossier.towing_vouchers = $vouchers;

            cb($dossier);
          }
        });
      });
    });
  });
};

exports.findById = findById;
