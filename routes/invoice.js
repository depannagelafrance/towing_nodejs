// -- IMPORT LIBRARIES
require('../util/common.js');

var express     = require('express');
var util        = require('util');
var _           = require('underscore');
var fs          = require('fs');
var path        = require('path');
var phantom     = require('node-phantom-simple');
var dateFormat  = require('dateformat');
var crypto      = require('crypto');
var jszip       = require('jszip');

var db          = require('../util/database.js');
var ju          = require('../util/json.js');
var LOG         = require('../util/logger.js');
var settings    = require('../settings/settings.js');

var company     = require('../model/company.js');


var TAG = 'invoice.js';

// -- CONFIGURE ROUTING
var router = express.Router();

//-- DEFINE CONSTANST
const SQL_CREATE_INVOICE_BATCH            = "CALL R_INVOICE_CREATE_BATCH(?); ";
const SQL_START_INVOICE_BATCH             = "CALL R_INVOICE_START_BATCH(?); ";
const SQL_FETCH_BATCH_INVOICES            = "CALL R_INVOICE_FETCH_BATCH_INVOICES(?); ";
const SQL_FETCH_BATCH_INVOICE_LINES       = "CALL R_INVOICE_FETCH_BATCH_INVOICE_LINES(?,?); ";
const SQL_FETCH_BATCH_INVOICE_CUSTOMER    = "CALL R_INVOICE_FETCH_BATCH_INVOICE_CUSTOMER(?,?); ";
const SQL_ADD_ATTACHMENT_TO_VOUCHER       = "CALL R_ADD_ANY_DOCUMENT("
                                               + "?," //voucher_id
                                               + "?," //filename
                                               + "?," //content type
                                               + "?," //file size
                                               + "?," //content
                                               + "?);"; //token

const PAGESETTINGS = {
  general: {
    loadImages: true,
    localToRemoteUrlAccessEnabled: false,
    javascriptEnabled: false,
    loadPlugins: false,
    quality: 75
  },
  viewport: {
    width: 800,
    height: 600
  },
  paper: {
    format: 'A4', orientation: 'portrait', border: '0.5cm'
  }
};

//-- CREATE A SIGNATURE
router.post('/batch/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);

  //create a new invoice batch and fetch the batch_id from the result
  db.one(SQL_CREATE_INVOICE_BATCH, [$token], function($error, $result, $fields) {
    if($result && $result.invoice_batch_id)
    {
      var $invoice_batch_id = $result.invoice_batch_id;

      company.findCurrentCompany($token, function($_company)
      {
        //start a new invoice batch
        db.many(SQL_START_INVOICE_BATCH, [$invoice_batch_id], function($error, $result, $fields)
        {
          //when the batch is complated, fetch the invoices from the batch
          //open the template
            var $filename='./templates/invoice/invoice.html';

            fs.readFile($filename, 'utf8', function($err, $data)
            {
              if($err)
              { 
                LOG.d(TAG, JSON.stringify($err));
                throw $err;
              }

              //compile the template
              var folder = settings.fs.invoice_store;

              phantom.create(function (error, ph)
              {
                db.many(SQL_FETCH_BATCH_INVOICES, [$invoice_batch_id], function($error, $result, $fields)
                {
                  $result.forEach(function($invoice)
                  {
                    //fetch the invoice customer
                    db.one(SQL_FETCH_BATCH_INVOICE_CUSTOMER, [$invoice.id, $invoice_batch_id], function($error, $invoice_customer, $fields)
                    {
                      //fetch the invoice lines for each fetched invoice
                      var $_invoice = $invoice;
                      $_invoice.customer = $invoice_customer;

                      db.many(SQL_FETCH_BATCH_INVOICE_LINES, [$invoice.id, $invoice_batch_id], function($error, $invoice_lines, $fields)
                      {
                        $_invoice.invoice_lines = $invoice_lines;

                        // console.log($invoice);

                        //create a new invoice pdf
                        var $template = _.template($data);

                        var $compiled_template = $template({
                          'company'      : $_company,
                          'invoice'      : $_invoice,
                          'invoice_date' :  convertUnixTStoDateFormat($_invoice.invoice_date, "dd/mm/yyyy")
                        });

                        var filename = 'invoice_' + $_invoice.invoice_number + ".pdf";

                        ph.createPage(function (error, page)
                        {
                          page.settings = PAGESETTINGS.general;
                          page.set('viewportSize', PAGESETTINGS.viewport);
                          page.set('paperSize', PAGESETTINGS.paper);
                          page.set('content', $compiled_template, function (error) {
                            if (error) {
                              LOG.e(TAG, 'Error setting content: ' + error);
                            }
                          });

                          page.onLoadFinished = function (status)
                          {

                            page.render(folder + filename, function (error)
                            {
                              if (error)
                              {
                                LOG.e(TAG, 'Error rendering PDF: ' + error);
                              }
                              else
                              {
                                LOG.d(TAG, "PDF GENERATED : " + status);

                                fs.readFile(folder + filename, "base64", function(a_error, data)
                                {
                                  LOG.d(TAG, "Read file: " + folder + filename);

                                  db.one(SQL_ADD_ATTACHMENT_TO_VOUCHER, [$_invoice.towing_voucher_id, filename, "application/pdf", data.length, data, $token], function($error, $result, $fields) {
                                    //fire and forget
                                  });

                                  //LOG.d(TAG, "Error: " + JSON.stringify(a_error));

                                  // ju.send($req, $res, {
                                  //   "filename" : "voucher_" + $voucher.voucher_number + ".pdf",
                                  //   "content_type" : "application/pdf",
                                  //   "data" : data
                                  // });

                                  // delete the file
                                  fs.unlink(folder + filename, function (err) {
                                    if (err) {
                                      LOG.e(TAG, "Could not delete file: " + JSON.stringify(err));
                                    } else {
                                      LOG.d(TAG, 'successfully deleted /tmp/' + filename);
                                    }
                                  });

                                  // ph.exit();
                                });
                              }
                            });

                            //ph.exit();
                          }
                        }); //end ph.create



                        //store the invoice pdf in the documents folder of the towing voucher

                        //add the invoice pdf to a zip file for this batch

                        //store the invoice batch zip on disk
                      });
                    });
                  });
                });
              });
          });
        });
      });

      ju.send($req, $res, {"result": "ok", "invoice_batch_id": $result.invoice_batch_id});
    }
  });
});


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
