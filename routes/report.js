// -- IMPORT LIBRARIES
var _         = require('underscore');
var express   = require('express');
var fs        = require('fs');
var path      = require('path');
var phantom   = require('phantom');
var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');


const TAG = 'report.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANST
const SQL_PROCESS_LOGIN       = "CALL R_LOGIN(?,?);";
const SQL_PROCESS_TOKEN_AUTH  = "CALL R_LOGIN_TOKEN(?)";


// -- ONLY POSTS ARE ALLOWED
router.get('/towing_voucher/:id/:token', function($req, $res) {
  var $filename='./templates/report/towing_voucher.html';

  fs.readFile($filename, 'utf8', function($err, $data){
    if($err) { 
      console.log($err);
      throw $err;
    }

    var $template = _.template($data);
    var $vars = {
      "allotment_name"      : "Perceel 1",
      "voucher_number"      : "00768",
      "call_number"         : "PA04675591",
      "towing_service_name" : "Depannage La France",
      "towing_service_street": "Tweemonstraat",
      "towing_service_nr"   : "310",
      "towing_service_zip"  : "2100",
      "towing_service_city" : "Deurne",
      "towing_service_phone": "+32 (0)3 325 19 15",
      "towing_service_fax"  : "+32 (0)3 328 19 30",
      "towing_service_vat"  : "BE0454.913.865",
      "towing_service_email": "info@depannagelafrance.be",
      "towing_service_site" : "www.depannagelafrance.be",
      "location"            : "Borgerhout",
      "nr_of_blocked_lanes" : 0,
      "direction"           : "R1 &gt; GEN",
      "indicator"           : "6.0",
      "lane_indicator"      : "PECH",
      "call_date"           : "04/09/2014",
      "call_hour"           : "19:13",
      "signa_arrival"       : "19:22",
      "towing_arrival"      : "19:20",
      "towing_start"        : "19:22",
      "towing_end"          : "19:34",
      "payment_method"      : "Contant",
      "extra_info"          : "",
      "nr_of_vouchers"      : 1,
      "towing_location_depot" : "Depot La France, Tweemontstraat 310, 2100 Deurne"
    };

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
          if (error) console.log('Error rendering PDF: %s', error);
          ph.exit();
          //cb && cb();
        });
      });
    });


    $res.end('ok, seems to be working?');
  });
});


module.exports = router;
