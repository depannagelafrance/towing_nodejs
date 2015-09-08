var _           = require('underscore');
var express     = require('express');
var fs          = require('fs');
var path        = require('path');
var phantom     = require('node-phantom-simple');
var dateFormat  = require('dateformat');
var crypto      = require('crypto');


var db        = require('../util/database.js');
var LOG       = require('../util/logger.js');
var common    = require('../util/common.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var dateutil  = require('../util/date.js');

var settings  = require('../settings/settings.js');
var vocab     = require('../model/vocab.js');

var TAG = 'model/dossier.js';

const SQL_FETCH_DOSSIER_BY_ID               = "CALL R_FETCH_DOSSIER_BY_ID(?,?)";
const SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER  = "CALL R_FETCH_TOWING_VOUCHERS_BY_DOSSIER(?,?)";
const SQL_FETCH_TOWING_PAYMENTS_BY_VOUCHER  = "CALL R_FETCH_TOWING_PAYMENTS_BY_VOUCHER(?, ?, ?); ";
const SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER = "CALL R_FETCH_TOWING_ACTIVITIES_BY_VOUCHER(?, ?, ?);";
const SQL_FETCH_ALL_DOSSIER_TRAFFIC_LANES   = "CALL R_FETCH_ALL_DOSSIER_TRAFFIC_LANES(?,?);";

const SQL_FETCH_TOWING_DEPOT                = "CALL R_FETCH_TOWING_DEPOT(?, ?); ";

const SQL_FETCH_CUSTOMER                    = "CALL R_FETCH_TOWING_CUSTOMER(?, ?); ";
const SQL_FETCH_CAUSER                      = "CALL R_FETCH_TOWING_CAUSER(?, ?); ";
const SQL_FETCH_TOWING_COMPANY              = "CALL R_FETCH_TOWING_COMPANY_BY_DOSSIER(?, ?); ";
const SQL_FETCH_INSURANCE_BY_ID             = "CALL R_FETCH_INSURANCE_BY_ID(?,?);";


const SQL_FETCH_CAUSER_SIGNATURE            = "CALL R_FETCH_CAUSER_SIGNATURE_BY_VOUCHER(?,?);";
const SQL_FETCH_CAUSER_SIGNATURE_BLOB       = "CALL R_FETCH_CAUSER_SIGNATURE_BLOB_BY_VOUCHER(?,?);";
const SQL_FETCH_COLLECTOR_SIGNATURE         = "CALL R_FETCH_COLLECTOR_SIGNATURE_BY_VOUCHER(?,?);";
const SQL_FETCH_COLLECTOR_SIGNATURE_BLOB    = "CALL R_FETCH_COLLECTOR_SIGNATURE_BLOB_BY_VOUCHER(?,?);";
const SQL_FETCH_TRAFFIC_POST_SIGNATURE      = "CALL R_FETCH_TRAFFIC_POST_SIGNATURE_BY_VOUCHER(?,?);";
const SQL_FETCH_POLICE_SIGNATURE_BLOB       = "CALL R_FETCH_TRAFFIC_POST_SIGNATURE_BLOB_BY_VOUCHER(?,?);";
const SQL_FETCH_SIGNA_SIGNATURE             = "CALL R_FETCH_USER_SIGNATURE(?,?);";

const SQL_FETCH_COMM_AND_ATT_SUMMARY        = "CALL R_FETCH_COMM_AND_ATT_SUMMARY(?,?,?);";

const SQL_FETCH_ALLOTMENT_AGENCY            = "CALL R_FETCH_ALLOTMENT_AGENCY_BY_ALLOTMENT(?,?); ";

const SQL_FETCH_ALL_TOWING_VOUCHER_ADDITIONAL_COSTS = "CALL R_FETCH_ALL_TOWING_ADDITIONAL_COSTS(?, ?); ";


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

                                    db.many(SQL_FETCH_ALL_TOWING_VOUCHER_ADDITIONAL_COSTS, $vt_params, function($error, $t_result, $fields)
                                    {
                                        $voucher.towing_additional_costs = $t_result;

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
  });
};

var createTowingVoucherReport = function($dossier_id, $voucher_id, $type, $token, $req, $res, cb) {
  findById($dossier_id, $token, function($dossier)
  {
    var $filename='./templates/report/towing_voucher.html';

    fs.readFile($filename, 'utf8', function($err, $data){
      if($err) { 
        LOG.d(TAG, JSON.stringify($err));
        throw $err;
      }

      var $template = _.template($data);
      var $vars = convertToVoucherReportParams($dossier, $voucher_id, $type, $token);

      //filter correct towing vouchers
      for($i = 0; $i < $dossier.towing_vouchers.length && !$voucher; $i++)
        $voucher = ($dossier.towing_vouchers[$i].id == $voucher_id ? $dossier.towing_vouchers[$i] : null);

      if(!$voucher)
        $voucher = $dossier.towing_vouchers[0];

      //fetch all data using callbacks
      db.many(SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER, [$dossier_id, $voucher_id, $token], function($error, $result, $fields) {
        $vars.towing_activities       = $result;

        LOG.d(TAG, "(JSON) Fetched towing activities: " + JSON.stringify($result));

        vocab.findAllTimeframes($token, function($data) {
          $vars.timeframes = $data;

          LOG.d(TAG, "Fetched timeframes");

          vocab.findAllTimeframeActivities($token, function($data) {
            $vars.timeframe_activities = $data;
            LOG.d(TAG, "Fetched timeframe activities");
            $vars.timeframe_activity_fees = [];

            $vars.timeframes.forEach(function($timeframe) {
              LOG.d(TAG, "Iterating over timeframes: " + $timeframe.id);

              vocab.findAllTimeframeActivityFees($timeframe.id, $token, function($data) {
                  $vars.timeframe_activity_fees.push($data);

                  LOG.d(TAG, "Length of timeframe array: " + $vars.timeframes.length);
                  LOG.d(TAG, "Length of timeframe fee array: " + $vars.timeframe_activity_fees.length);

                  if($vars.timeframe_activity_fees.length >= $vars.timeframes.length)
                  {
                    db.one(SQL_FETCH_CAUSER_SIGNATURE_BLOB, [$voucher_id, $token], function($error, $result, $fields)
                    {
                      $signature_causer = null;

                      if($result && 'content' in $result) {
                        $signature_causer = $result.content;
                      }

                      $vars.signature_causer = $signature_causer;


                      db.one(SQL_FETCH_COLLECTOR_SIGNATURE_BLOB, [$voucher_id, $token], function($error, $result, $fields) {
                        $collected_by_signature = null;

                        if($result && 'content' in $result) {
                          $collected_by_signature = $result.content;
                        }

                        $vars.collected_by_signature = $collected_by_signature;

                        db.one(SQL_FETCH_POLICE_SIGNATURE_BLOB, [$voucher_id, $token], function($error, $result, $fields) {
                          $signature_police = null;

                          if($result && 'content' in $result) {
                            $signature_police = $result.content;
                          }

                          $vars.signature_police = $signature_police;


                          db.one(SQL_FETCH_SIGNA_SIGNATURE, [$voucher.signa_id, $token], function($error, $result, $fields) {
                            $signature = null;

                            if($result && 'content' in $result) {
                              $signature = $result.content;
                            }

                            $vars.signature_signa = $signature;


                            if($voucher.insurance_id)
                            {
                                db.one(SQL_FETCH_INSURANCE_BY_ID, [$voucher.insurance_id, $token], function($error, $result, $fields) {
                                  $vars.insurance = $result;
                                  $vars.insurance.display_address = convertToAddressString($result);

                                  $compiled_template = $template($vars);

                                  renderPdfTemplate($dossier, $voucher, $compiled_template, $req, $res, cb);

                                });//end db.one(SQL_FETCH_INSURANCE_BY_ID)
                            }
                            else
                            {
                              $compiled_template = $template($vars);

                              renderPdfTemplate($dossier, $voucher, $compiled_template, $req, $res, cb);
                            } //end if ($voucher.insurance_id)
                          }); //db.one(fetch signa signature)
                        }); //end db.one(police signature)
                      }); //end db.one(collector signature)
                    }); //end db.one(causer signature)
                  } //end if on length check
              });//end find all timeframe activity fees
            }); //end foreach timeframe
          });//end vocab find all timeframe activies
        });//end find all timeframes
      });
    });
  });
};

function renderPdfTemplate($dossier, $voucher, $compiled_template, $req, $res, cb)
{
    phantom.create(function (error, ph) {
      var filename = $voucher.towing_voucher_filename; //crypto.randomBytes(64).toString('hex') + ".pdf";
      var folder = settings.fs.tmp;

      ph.createPage(function (error, page)
      {
        page.settings = {
          loadImages: true,
          localToRemoteUrlAccessEnabled: false,
          javascriptEnabled: false,
          loadPlugins: false,
          quality: 75
         };
        page.set('viewportSize', { width: 800, height: 600 });
        page.set('paperSize', { format: 'A4', orientation: 'portrait', border: '0.5cm' });
        page.set('content', $compiled_template, function (error) {
          if (error) {
            console.log('Error setting content: ', error);
          }
        });


        page.onResourceRequested = function (rd, req)
        {
          //console.log("REQUESTING: ", rd[0]["url"]);
        }

        page.onResourceReceived = function (rd)
        {
          //rd.stage == "end" && console.log("LOADED: ", rd["url"]);
        }

        page.onLoadFinished = function (status)
        {
          console.log("Finished loading: " + status);

          page.render(folder + filename, function (error)
          {
            if (error)
            {
              console.log('Error rendering PDF: %s', error);
            }
            else
            {
              console.log("PDF GENERATED : ", status);

              fs.readFile(folder + filename, "base64", function(a_error, data) {
                LOG.d(TAG, "Read file: " + folder + filename);
                //LOG.d(TAG, "Error: " + JSON.stringify(a_error));

                cb(filename, data, $dossier, $voucher);

                // delete the file
                fs.unlink(folder + filename, function (err) {
                  if (err) {
                    LOG.e(TAG, "Could not delete file: " + JSON.stringify(err));
                  } else {
                    LOG.d(TAG, 'successfully deleted /tmp/' + filename);
                  }
                });

                ph.exit();
              });
            }

            ph.exit();
          });
        }
      }); //end ph.create
    }); //end phantom.create
}


function convertToAddressString($info) {
  var $address = '';

  if($info)
  {
    $address += ($info.street ? $info.street : '') + ' ';
    $address += $info.street_number ? $info.street_number : '';

    $address = $address.trim();

    $address += ($info.street_pobox ? '/' + $info.street_pobox : '');

    $address = $address + ', ';

    $address += $info.zip ? $info.zip + ' ' : '';

    $address += $info.city ? $info.city + ' ' : '';

    $address = $address.trim();

    $address += ', ' + ($info.country ? $info.country : '');
  }

  return $address.trim();
}

function convertToNameString($data) {
  $name = '';

  if($data)
  {
    if($data.company_name)
    {
      $name = $data.company_name;
    }
    else
    {
      $voucher.causer.company_name ? $voucher.causer.company_name : $voucher.causer.last_name + ' ' + $voucher.causer.first_name

      if($data.last_name) {
        $name += $data.last_name + ' ';
      }

      if($data.first_name) {
        $name += $data.first_name;
      }
    }
  }

  return $name.trim();
}

function convertToVoucherReportParams($dossier, $voucher_id, $type, $token) {
  $voucher = null;

  //filter our the correct towing voucher
  for($i = 0; $i < $dossier.towing_vouchers.length && !$voucher; $i++)
    $voucher = ($dossier.towing_vouchers[$i].id == $voucher_id ? $dossier.towing_vouchers[$i] : null);

  if(!$voucher)
    $voucher = $dossier.towing_vouchers[0];


  // ---------------------------------------------------------------------------
  // Setting the "copy for text"
  $copy_for = "";

  switch($type) {
    case 'towing':    $copy_for = "Exemplaar dienstverlener"; break;
    case 'collector': $copy_for = "Exemplaar afhaler";        break;
    case 'customer':  $copy_for = "Exemplaar klant";          break;
    default:
      $copy_for = "Exemplaar dienstverlener";
  }


  // ---------------------------------------------------------------------------
  // setting variables
  try {
    var $params = {
      "allotment_name"      : $dossier.allotment_name,
      "voucher_number"      : 'B'+$voucher.voucher_number,
      "call_number"         : $dossier.call_number,
      "timeframe_name"      : $dossier.timeframe_name,
      "timeframe_id"        : $dossier.timeframe_id,
      "towing_service_name" : $dossier.towing_company.name,
      "towing_service_street": $dossier.towing_company.street,
      "towing_service_nr"   : $dossier.towing_company.street_number,
      "towing_service_zip"  : $dossier.towing_company.zip,
      "towing_service_city" : $dossier.towing_company.city,
      "towing_service_phone": $dossier.towing_company.phone,
      "towing_service_fax"  : $dossier.towing_company.fax,
      "towing_service_vat"  : $dossier.towing_company.vat,
      "towing_service_email": $dossier.towing_company.email,
      "towing_service_site" : $dossier.towing_company.website,
      "location"            : $dossier.indicator_zip + " " + $dossier.indicator_city,
      "nr_of_blocked_lanes" : $dossier.nr_of_block_lanes,
      "direction"           : $dossier.direction_name,
      "indicator"           : $dossier.indicator_name,
      "indicator_zip"       : $dossier.indicator_zip,
      "indicator_city"      : $dossier.indicator_city,
      "lane_indicator"      : $dossier.traffic_lane_name,
      "call_date"           : dateFormat($dossier.call_date, "dd/mm/yyyy"),
      "cb_is_holiday"       : $dossier.call_date_is_holiday == 1 ? '&#9746;' : '&#9744;',
      "call_hour"           : dateFormat($dossier.call_date, "HH:MM"),
      "signa_arrival"       : convertUnixTStoTimeFormat($voucher.signa_arrival),
      "signa_licence_plate" : $voucher.signa_by_vehicle,
      "towing_arrival"      : convertUnixTStoTimeFormat($voucher.towing_arrival),
      "towing_start"        : convertUnixTStoTimeFormat($voucher.towing_start),
      "towing_end"          : convertUnixTStoTimeFormat($voucher.towing_completed),
      "towing_licence_plate": $voucher.towed_by_vehicle,
      "extra_info"          : $voucher.additional_info,
      "nr_of_vouchers"      : $dossier.nr_of_vouchers,
      "towing_location_depot" :  $voucher.depot.display_name,
      "causer_name"         : convertToNameString($voucher.causer),
      "causer_address"      : convertToAddressString($voucher.causer),
      "causer_phone"        : $voucher.causer.phone,
      "causer_vat"          : $voucher.causer.vat,
      "customer_name"       : convertToNameString($voucher.customer),
      "customer_address"    : convertToAddressString($voucher.customer),
      "customer_phone"      : $voucher.customer.phone,
      "customer_vat"                : $voucher.customer.company_vat,
      "company_vat_foreign_country" : $voucher.customer.company_vat_foreign_country,
      "vehicule"            : $voucher.vehicule,
      "vehicule_type"       : $voucher.vehicule_type,
      "vehicule_licence_plate" : $voucher.vehicule_licenceplate,
      'cb_incident_type_panne'                  : $dossier.incident_type_code == 'PANNE' || $dossier.incident_type_code_agency == 'SIGNA_PANNE' ? '&#9746;' : '&#9744;',
      'cb_incident_type_ongeval'                : $dossier.incident_type_code == 'ONGEVAL' || $dossier.incident_type_code_agency == 'SIGNA_ONGEVAL' ? '&#9746;' : '&#9744;',
      'cb_incident_type_achtergelaten_voertuig' : $dossier.incident_type_code == 'ACHTERGELATEN_VOERTUIG' ? '&#9746;' : '&#9744;',
      'cb_incident_type_signalisatie'           : $dossier.incident_type_code == 'SIGNALISATIE' ? '&#9746;' : '&#9744;',
      'cb_incident_type_verloren_voorwerp'      : $dossier.incident_type_code == 'VERLOREN_VOORWERP' ? '&#9746;' : '&#9744;',
      'cb_incident_type_botsabsorbeerder'       : $dossier.incident_type_code == 'BOTSABSORBEERDER' ? '&#9746;' : '&#9744;',
      'collected_by'                : $voucher.collector_name,
      'collection_date'             : convertUnixTStoDateFormat($voucher.vehicule_collected),
      'traffic_post'                : $dossier.traffic_post_name,
      'traffic_post_phone'          : $dossier.traffic_post_phone,
      'traffic_post_confirmation'   : convertUnixTStoTimeFormat($voucher.police_signature_dt),
      'copy_for'                    : $copy_for,
      'insurance_name'              : $voucher.insurance_name,
      'insurance_dossier'           : $voucher.insurance_dossiernr,
      'towing_payments'             : $voucher.towing_payments,
      'is_covered_by_insurance'     : $voucher.insurance_id ? true : false,
      'towing_additional_costs'     : $voucher.towing_additional_costs
    };

    return $params;
  }
  catch($e)
  {
    console.error($e);
    LOG.e(TAG, "Error while setting parameters: " + JSON.stringify($e));
  }

  return {};
}

function convertUnixTStoTimeFormat($unix_ts)
{
  if($unix_ts)
  {
    $_date = new Date($unix_ts * 1000);

    return dateFormat($_date, "HH:MM");
  }

  return "";
}

function convertUnixTStoDateFormat($unix_ts)
{
  if($unix_ts)
  {
    $_date = new Date($unix_ts * 1000);

    return dateFormat($_date, "dd/mm/yyyy");
  }

  return "";
}

exports.findById = findById;
exports.createTowingVoucherReport = createTowingVoucherReport;
