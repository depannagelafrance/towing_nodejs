// -- IMPORT LIBRARIES
var _           = require('underscore');
var express     = require('express');
var fs          = require('fs');
var path        = require('path');
var phantom     = require('phantom');
var dateFormat  = require('dateformat');

var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');

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
        console.log($err);
        throw $err;
      }

      var $template = _.template($data);
      var $vars = convertToVoucherReportParams($dossier);

      LOG.d(TAG, "Setting variables for template: " + JSON.stringify($vars));

      $compiled_template = $template($vars);

      phantom.create(function (ph) {
        ph.createPage(function (page) {
          page.settings = {
            loadImages: true,
            localToRemoteUrlAccessEnabled: true,
            javascriptEnabled: true,
            loadPlugins: false
           };

          console.log(JSON.stringify(page.settings));

          page.set('viewportSize', { width: 800, height: 600 });
          page.set('paperSize', { format: 'A4', orientation: 'portrait', border: '0.5cm' });
          page.set('content', $compiled_template);

          page.render("/tmp/test.pdf", function (error) {


            if (error) { 
              console.log('Error rendering PDF: %s', error);
              ph.exit();
            } else {
              fs.readFile("/tmp/test.pdf", "base64", function(error, data) {
                //console.log(data);
                $res.end('');
                ph.exit();
              });
            }

          });
        });
      });
    });
  });


});

function convertToVoucherReportParams($dossier) {
  $voucher = $dossier.towing_vouchers[0];

  console.log($dossier);
  console.log($dossier.towing_company);

  return {
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
    "causer_name"         : 'P&amp;V assistance - I.m.a. BeNeLux',
    "causer_address"      : 'Sq Des Conquites D\'eau, 11-12 <br />4020 Liège',
    "causer_phone"        : '02/229.00.11',
    "causer_vat"          : 'BE 0402.236.531',
    "vehicule_type"       : 'Ford C-MAX',
    "vehicule_licence_plate" : '1-GSA-659'
  };
}

module.exports = router;
