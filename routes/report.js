// -- IMPORT LIBRARIES
var _           = require('underscore');
var express     = require('express');
var fs          = require('fs');
var path        = require('path');
var phantom     = require('node-phantom-simple');
var dateFormat  = require('dateformat');
var crypto      = require('crypto');

var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');
var settings  = require('../settings/settings.js');
var vocab     = require('../model/vocab.js');

var dossier   = require('../model/dossier.js');

const TAG = 'report.js';

const SQL_FETCH_CAUSER_SIGNATURE            = "CALL R_FETCH_CAUSER_SIGNATURE_BLOB_BY_VOUCHER(?,?);";
const SQL_FETCH_POLICE_SIGNATURE            = "CALL R_FETCH_TRAFFIC_POST_SIGNATURE_BLOB_BY_VOUCHER(?,?);";
const SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER = "CALL R_FETCH_TOWING_ACTIVITIES_BY_VOUCHER(?, ?, ?);";

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANST


// -- ONLY POSTS ARE ALLOWED
router.get('/towing_voucher/:type/:dossier_id/:voucher_id/:token', function($req, $res) {
  var $dossier_id = ju.requiresInt('dossier_id', $req.params);
  var $voucher_id = ju.requiresInt('voucher_id', $req.params);
  var $token      = ju.requires('token', $req.params);
  var $type       = ju.requires('type', $req.params);

  dossier.findById($dossier_id, $token, function($dossier){
    var $filename='./templates/report/towing_voucher.html';

    fs.readFile($filename, 'utf8', function($err, $data){
      if($err) { 
        LOG.d(TAG, JSON.stringify($err));
        throw $err;
      }

      var $template = _.template($data);
      var $vars = convertToVoucherReportParams($dossier, $voucher_id, $type, $token);

      db.many(SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER, [$dossier_id, $voucher_id, $token], function($error, $result, $fields) {
        $vars.towing_activities       = $result;

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
                    db.one(SQL_FETCH_CAUSER_SIGNATURE, [$voucher_id, $token], function($error, $result, $fields)
                    {
                      $signature_causer = null;

                      if($result && 'content' in $result) {
                        $signature_causer = $result.content;
                      }

                      $vars.signature_causer = $signature_causer;


                      db.one(SQL_FETCH_POLICE_SIGNATURE, [$voucher_id, $token], function($error, $result, $fields) {
                        $signature_police = null;

                        if($result && 'content' in $result) {
                          $signature_police = $result.content;
                        }

                        $vars.signature_police = $signature_police;

                        //LOG.d(TAG, "Setting variables for template: " + JSON.stringify($vars));

                        $compiled_template = $template($vars);

                        renderPdfTemplate($voucher, $compiled_template, $req, $res);
                      }); //end db.one(police signature)
                    }); //end db.one(causer signature)
                  } //end if on length check
              });//end find all timeframe activity fees
            }); //end foreach timeframe
          });//end vocab find all timeframe activies
        });//end find all timeframes
      });
    });
  });
});

function renderPdfTemplate($voucher, $compiled_template, $req, $res)
{
    phantom.create(function (error, ph) {
      var filename = crypto.randomBytes(64).toString('hex') + ".pdf";
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
                LOG.d(TAG, "Error: " + JSON.stringify(a_error));

                ju.send($req, $res, {
                  "filename" : "voucher_" + $voucher.voucher_number + ".pdf",
                  "content_type" : "application/pdf",
                  "data" : data
                });

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

    $address = $address + '<br />';

    $address += $info.zip ? $info.zip : '';
    $address += ' ';

    $address = $address.trim();

    $address += $info.city ? $info.city : '';

    $address += '<br />' + ($info.country ? $info.country : '');
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
      "voucher_number"      : $voucher.voucher_number,
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
      "location"            : "",
      "nr_of_blocked_lanes" : "",
      "direction"           : $dossier.direction_name,
      "indicator"           : $dossier.indicator_name,
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
      "payment_method"      : "Contant",
      "extra_info"          : $voucher.additional_info,
      "nr_of_vouchers"      : 1,
      "towing_location_depot" :  $voucher.depot.display_name,
      "causer_name"         : convertToNameString($voucher.causer),
      "causer_address"      : convertToAddressString($voucher.causer),
      "causer_phone"        : $voucher.causer.phone,
      "causer_vat"          : $voucher.causer.vat,
      "customer_name"       : convertToNameString($voucher.customer),
      "customer_address"    : convertToAddressString($voucher.customer),
      "customer_phone"      : $voucher.customer.phone,
      "customer_vat"        : $voucher.customer.company_vat,
      "vehicule_type"       : $voucher.vehicule_type,
      "vehicule_licence_plate" : $voucher.vehicule_licenceplate,
      'cb_incident_type_panne'                  : $dossier.incident_type_code == 'PANNE' ? '&#9746;' : '&#9744;',
      'cb_incident_type_ongeval'                : $dossier.incident_type_code == 'ONGEVAL' ? '&#9746;' : '&#9744;',
      'cb_incident_type_achtergelaten_voertuig' : $dossier.incident_type_code == 'ACHTERGELATEN_VOERTUIG' ? '&#9746;' : '&#9744;',
      'cb_incident_type_signalisatie'           : $dossier.incident_type_code == 'SIGNALISATIE' ? '&#9746;' : '&#9744;',
      'cb_incident_type_verloren_voorwerp'      : $dossier.incident_type_code == 'VERLOREN_VOORWERP' ? '&#9746;' : '&#9744;',
      'cb_incident_type_botsabsorbeerder'       : $dossier.incident_type_code == 'BOTSABSORBEERDER' ? '&#9746;' : '&#9744;',
      'collected_by'                : $voucher.collector_name,
      'collection_date'             : convertUnixTStoDateFormat($voucher.vehicule_collected),
      'traffic_post'                : $dossier.traffic_post_name,
      'traffic_post_phone'          : $dossier.traffic_post_phone,
      'traffic_post_confirmation'   : '',
      'copy_for'                    : $copy_for,
      'insurance_name'              : $voucher.insurance_name,
      'insurance_dossier'           : $voucher.insurance_dossiernr,
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


module.exports = router;
