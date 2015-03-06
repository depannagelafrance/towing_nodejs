var db        = require('../util/database.js');
var LOG       = require('../util/logger.js');
var common    = require('../util/common.js');

var TAG = 'model/dossier.js';

const SQL_FETCH_DOSSIER_BY_ID               = "CALL R_FETCH_DOSSIER_BY_ID(?,?)";
const SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER  = "CALL R_FETCH_TOWING_VOUCHERS_BY_DOSSIER(?,?)";
const SQL_FETCH_TOWING_PAYMENTS_BY_VOUCHER  = "CALL R_FETCH_TOWING_PAYMENTS_BY_VOUCHER(?, ?, ?); ";
const SQL_FETCH_ALL_DOSSIER_TRAFFIC_LANES   = "CALL R_FETCH_ALL_DOSSIER_TRAFFIC_LANES(?,?);";

const SQL_FETCH_TOWING_DEPOT                = "CALL R_FETCH_TOWING_DEPOT(?, ?); ";

const SQL_FETCH_CUSTOMER                    = "CALL R_FETCH_TOWING_CUSTOMER(?, ?); ";
const SQL_FETCH_CAUSER                      = "CALL R_FETCH_TOWING_CAUSER(?, ?); ";
const SQL_FETCH_TOWING_COMPANY              = "CALL R_FETCH_TOWING_COMPANY_BY_DOSSIER(?, ?); ";

const SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER = "CALL R_FETCH_TOWING_ACTIVITIES_BY_VOUCHER(?, ?, ?);";

const SQL_FETCH_CAUSER_SIGNATURE            = "CALL R_FETCH_CAUSER_SIGNATURE_BY_VOUCHER(?,?);";
const SQL_FETCH_COLLECTOR_SIGNATURE         = "CALL R_FETCH_COLLECTOR_SIGNATURE_BY_VOUCHER(?,?);";
const SQL_FETCH_TRAFFIC_POST_SIGNATURE      = "CALL R_FETCH_TRAFFIC_POST_SIGNATURE_BY_VOUCHER(?,?);";

const SQL_FETCH_COMM_AND_ATT_SUMMARY        = "CALL R_FETCH_COMM_AND_ATT_SUMMARY(?,?,?);";

const SQL_FETCH_ALLOTMENT_AGENCY            = "CALL R_FETCH_ALLOTMENT_AGENCY_BY_ALLOTMENT(?,?); ";

var findById = function($dossier_id, $token, cb) {
  var $dossier = {};

  db.one(SQL_FETCH_DOSSIER_BY_ID, [$dossier_id, $token], function($error, $d_result, $fields)
  {
    $dossier = $d_result;

    if(!$dossier) {
      throw new common.InvalidRequest();
    }

    db.one(SQL_FETCH_ALLOTMENT_AGENCY, [$dossier.allotment_id, $token], function($error, $a_result, $fields) {
      $dossier.allotment_agency = $a_result;
    });

    //set the selected towing company
    db.one(SQL_FETCH_TOWING_COMPANY, [$dossier_id, $token], function($error, $t_result, $fields){
        $dossier.towing_company = $t_result;
    });

    db.many(SQL_FETCH_ALL_DOSSIER_TRAFFIC_LANES, [$dossier_id, $token], function($error, $result, $fields) {
      $dossier.traffic_lanes = $result;
    });

    db.many(SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER, [$dossier_id, $token],function($error, $v_result, $fields)
    {
      $vouchers = [];

      $v_result.forEach(function($voucher) {
        var $dvt_params = [$dossier_id, $voucher.id, $token];
        var $vt_params  = [$voucher.id, $token];

        //settign the summary of the uploaded attachments and sent communications
        // db.many(SQL_FETCH_COMM_AND_ATT_SUMMARY, $dvt_params, function($error, $att_result, $fields) {
        //     $_result = {};
        //
        //     $att_result.forEach(function($item) {
        //         $_result[$item.type] = $item.number;
        //     });
        //
        //     $voucher.communication_and_attachment_summary = $_result;
        // });

        //fetch the towing payments information
        db.one(SQL_FETCH_TOWING_PAYMENTS_BY_VOUCHER, $dvt_params, function($error, $p_result, $fields)
        {
            $voucher.towing_payments = $p_result;

            //towing depot
            db.one(SQL_FETCH_TOWING_DEPOT, $vt_params, function($error, $t_result, $fields)
            {
                $voucher.depot = $t_result;

                //towing customer
                db.one(SQL_FETCH_CUSTOMER, $vt_params, function($error, $t_result, $fields)
                {
                    $voucher.customer = $t_result;

                    //towing causer
                    db.one(SQL_FETCH_CAUSER, $vt_params, function($error, $t_result, $fields)
                    {
                        $voucher.causer = $t_result;

                        //fetch the reference to the causer signature
                        db.one(SQL_FETCH_CAUSER_SIGNATURE, $vt_params, function($error, $t_result, $fields)
                        {
                            $voucher.signature_causer = $t_result;

                            //fetch the reference to the collector signature
                            db.one(SQL_FETCH_COLLECTOR_SIGNATURE, $vt_params, function($error, $t_result, $fields)
                            {
                                $voucher.signature_collector = $t_result;

                                //fetch the reference to the causer signature
                                db.one(SQL_FETCH_TRAFFIC_POST_SIGNATURE, $vt_params, function($error, $t_result, $fields)
                                {
                                    $voucher.signature_traffic_post = $t_result;

                                    //fetch the towing activities information
                                    db.many(SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER, $dvt_params, function($error, $a_result, $fields)
                                    {
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
                    });
                });
            });
        });
      });
    });
  });
};

exports.findById = findById;
