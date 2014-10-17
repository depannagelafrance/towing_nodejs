// -- IMPORT LIBRARIES
var _           = require('underscore');
var express     = require('express');
var fs          = require('fs');
var path        = require('path');
//var phantom     = require('phantom');
var phantom = require('node-phantom-simple');
var dateFormat  = require('dateformat');
var crypto      = require('crypto');

var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');
var settings  = require('../settings/settings.js');

var dossier   = require('../model/dossier.js');

const TAG = 'report.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANST


// -- ONLY POSTS ARE ALLOWED
router.get('/towing_voucher/:id/:token', function($req, $res) {
  var $dossier_id = ju.requiresInt('id', $req.params);
  var $token = ju.requires('token', $req.params);

  dossier.findById($dossier_id, $token, function($dossier){
    var $filename='./templates/report/towing_voucher.html';

    fs.readFile($filename, 'utf8', function($err, $data){
      if($err) { 
        LOG.d(TAG, JSON.stringify($err));
        throw $err;
      }

      var $template = _.template($data);
      var $vars = convertToVoucherReportParams($dossier);

      //LOG.d(TAG, "Setting variables for template: " + JSON.stringify($vars));

      $compiled_template = $template($vars);

 phantom.create(function (error, ph) {
   console.log("phantom.create");
   console.log(error);


    var filename = crypto.randomBytes(64).toString('hex') + ".pdf";
    var folder = settings.fs.tmp;

    ph.createPage(function (error, page) {
      console.log("ph.createPage");
      console.log(error);
      page.settings = {
        loadImages: true,
        localToRemoteUrlAccessEnabled: true,
        javascriptEnabled: true,
        loadPlugins: false
       };
      page.set('viewportSize', { width: 800, height: 600 });
      page.set('paperSize', { format: 'A4', orientation: 'portrait', border: '0.5cm' });
      page.set('content', $compiled_template, function (error) {
        if (error) {
          console.log('Error setting content: ', error);
        }
      });

      page.onResourceRequested = function (rd, req) {
        console.log("REQUESTING: ", rd[0]["url"]);
      }
      page.onResourceReceived = function (rd) {
        rd.stage == "end" && console.log("LOADED: ", rd["url"]);
      }
      page.onLoadFinished = function (status) {
        console.log("Finished loading: " + status);

        page.render(folder + filename, function (error) {
          if (error) {
            console.log('Error rendering PDF: %s', error);
          } else {
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
    });
  });


      /*phantom.create(function (ph) {
        ph.createPage(function (page)
        {
          var filename = crypto.randomBytes(64).toString('hex') + ".pdf";
          var folder = settings.fs.tmp;

          page.settings =
          {
            loadImages: true,
            localToRemoteUrlAccessEnabled: false,
            javascriptEnabled: false,
            loadPlugins: false
          };

          page.set('viewportSize', { width: 800, height: 600 });
          page.set('paperSize', { format: 'A4', orientation: 'portrait', border: '0.5cm' });
          page.set('content', $compiled_template);

          LOG.d(TAG, "Generating file: " + filename);

          page.render(folder + filename, function () {
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
          });
        });
      });*/
    });
  });


});


function convertToAddressString($info) {
  var $address = '';

  $address = $address + $info.street + ' ' + $info.street_number;
  $address = $address + ($info.street_pobox ? '/' + $info.street_pobox : '');
  $address = $address + '<br />';
  $address = $address + $info.zip + ' ' + $info.city;
  $address = $address + '<br />' + $info.country;

  return $address;
}

function convertToVoucherReportParams($dossier) {
  $voucher = $dossier.towing_vouchers[0];

  try {
    var $params = {
      "allotment_name"      : $dossier.allotment_name,
      "voucher_number"      : $voucher.voucher_number,
      "call_number"         : $dossier.call_number,
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
      "location"            : "Borgerhout",
      "nr_of_blocked_lanes" : 0,
      "direction"           : $dossier.direction_name,
      "indicator"           : $dossier.indicator_name,
      "lane_indicator"      : "PECH",
      "call_date"           : dateFormat($dossier.call_date, "dd/mm/yyyy"),
      "cb_is_holiday"       : $dossier.call_date_is_holiday == 1 ? '&#9746;' : '&#9744;',
      "call_hour"           : dateFormat($dossier.call_date, "hh:MM"),
      "signa_arrival"       : "19:22",
      "signa_licence_plate" : "1-XXX-XXX",
      "towing_arrival"      : "19:20",
      "towing_start"        : "19:22",
      "towing_end"          : "19:34",
      "towing_licence_plate": "1-YYY-YYY",
      "payment_method"      : "Contant",
      "extra_info"          : "",
      "nr_of_vouchers"      : 1,
      "towing_location_depot" :  $voucher.depot.display_name,
      "causer_name"         : $voucher.causer.company_name ? $voucher.causer.company_name : $voucher.causer.last_name + ' ' + $voucher.causer.first_name,
      "causer_address"      : convertToAddressString($voucher.causer),
      "causer_phone"        : $voucher.causer.phone,
      "causer_vat"          : $voucher.causer.vat,
      "customer_name"       : $voucher.customer.company_name ? $voucher.customer.company_name : $voucher.customer.last_name + ' ' + $voucher.customer.first_name,
      "customer_address"    : convertToAddressString($voucher.customer),
      "customer_phone"      : $voucher.customer.phone,
      "customer_vat"        : $voucher.customer,
      "vehicule_type"       : $voucher.vehicule_type,
      "vehicule_licence_plate" : $voucher.vehicule_licenceplate,
      'cb_incident_type_panne'                  : $dossier.incident_type_code == 'PANNE' ? '&#9746;' : '&#9744;',
      'cb_incident_type_ongeval'                : $dossier.incident_type_code == 'ONGEVAL' ? '&#9746;' : '&#9744;',
      'cb_incident_type_achtergelaten_voertuig' : $dossier.incident_type_code == 'ACHTERGELATEN_VOERTUIG' ? '&#9746;' : '&#9744;',
      'cb_incident_type_signalisatie'           : $dossier.incident_type_code == 'SIGNALISATIE' ? '&#9746;' : '&#9744;',
      'cb_incident_type_verloren_voorwerp'      : $dossier.incident_type_code == 'VERLOREN_VOORWERP' ? '&#9746;' : '&#9744;',
      'cb_incident_type_botsabsorbeerder'       : $dossier.incident_type_code == 'BOTSABSORBEERDER' ? '&#9746;' : '&#9744;',
      'collected_by'                : 'Klant',
      'collection_date'             : '01/01/2014',
      'traffic_post'                : 'Geen ploeg',
      'traffic_post_phone'          : '+32 (0)3 829 70 89',
      'traffic_post_confirmation'   : '',
      'copy_for'                    : 'exemplaar dienstverlener',
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

module.exports = router;
