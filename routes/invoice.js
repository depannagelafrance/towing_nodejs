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
const SQL_FETCH_COMPANY_INVOICES          = "CALL R_INVOICE_FETCH_COMPANY_INVOICES(?); ";
const SQL_FETCH_BATCH_RUNS                = "CALL R_INVOICE_FETCH_ALL_BATCH_RUNS(?); ";
const SQL_FETCH_BATCH_INVOICES            = "CALL R_INVOICE_FETCH_BATCH_INVOICES(?); ";
const SQL_FETCH_BATCH_INVOICE_LINES       = "CALL R_INVOICE_FETCH_BATCH_INVOICE_LINES(?,?); ";
const SQL_FETCH_COMPANY_INVOICE           = "CALL R_INVOICE_FETCH_COMPANY_INVOICE(?,?); ";
const SQL_FETCH_BATCH_INVOICE_CUSTOMER    = "CALL R_INVOICE_FETCH_BATCH_INVOICE_CUSTOMER(?,?); ";
const SQL_ADD_ATTACHMENT_TO_VOUCHER       = "CALL R_ADD_ANY_DOCUMENT("
                                               + "?," //voucher_id
                                               + "?," //filename
                                               + "?," //content type
                                               + "?," //file size
                                               + "?," //content
                                               + "?);"; //token
const SQL_CREATE_INVOICE_BATCH_FOR_VOUCHER = "CALL R_CREATE_INVOICE_BATCH_FOR_VOUCHER(?,?); ";
const SQL_START_INVOICE_BATCH_FOR_VOUCHER  = "CALL R_START_INVOICE_BATCH_FOR_VOUCHER(?,?,?); ";


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


//
// -- FETCH ALL COMPANY INVOICES
//
router.get('/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);

  db.many(SQL_FETCH_COMPANY_INVOICES, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});

//
// -- FETCH ALL BATCH RUNS
//
router.get('/batch/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);

  db.many(SQL_FETCH_BATCH_RUNS, [$token], function($error, $result, $fields) {
    ju.send($req, $res, $result);
  });
});


//
// -- PREPARE THE EXPORT FOR EXPERT-M
//
router.post('/invoice/export/expertm/:token', function($req, $res) {
  var $selected_ids = ju.requires('ids', $req.body);
  var $token        = ju.requires('token', $req.params);
  var $i = 0;

  $selected_ids.forEach(function($invoice_id) {
      //fetch the invoice
      db.one(SQL_FETCH_COMPANY_INVOICE, [$invoice_id, $token], function($error, $invoice, $fields)
      {
        //fetch the invoice customer
        db.one(SQL_FETCH_BATCH_INVOICE_CUSTOMER, [$invoice.id, $invoice.invoice_batch_run_id], function($error, $invoice_customer, $fields)
        {
          //fetch the invoice lines
          db.many(SQL_FETCH_BATCH_INVOICE_LINES, [$invoice.id, $invoice.invoice_batch_run_id], function($error, $invoice_lines, $fields)
          {
            //add to the xml file
            if($i >= $selected_ids.length) {
              //create a new zip
              //put the XML file in the zip file
              //send the zip back as base64
              ju.send($req, $res, {"result": "ok"});
            }
          });
        });
      });
  });
});

//
//-- CREATE A NEW BATCH (on purpose fault)
//
router.post('/batch/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);
  var $hash         = ju.requires('hash', $req.params); //done on purpose

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

//
//-- CREATE A NEW INVOICE FOR A VOUCHER
//
router.post('/voucher/:voucher_id/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);
  var $voucher_id   = ju.requiresInt('voucher_id', $req.params);

  db.one(SQL_CREATE_INVOICE_BATCH_FOR_VOUCHER, [$voucher_id, $token], function($error, $result, $fields) {
    if($result && $result.invoice_batch_id)
    {
      var $invoice_batch_id = $result.invoice_batch_id;

      company.findCurrentCompany($token, function($_company)
      {
        //start a new invoice batch
        db.one(SQL_START_INVOICE_BATCH_FOR_VOUCHER, [$voucher_id, $invoice_batch_id, $token], function($error, $result, $fields)
        {
          $call_date            = $result.call_date;
          $call_number          = $result.call_number;
          $vehicle              = $result.vehicule + ' ' + $result.vehicule_type;
          $vehicle_licenceplate = $result.vehicule_licenceplate;
          $invoice_due_date     = $result.invoice_due_date;

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
                          'company'           : $_company,
                          'invoice'           : $_invoice,
                          'invoice_date'      : convertUnixTStoDateFormat($_invoice.invoice_date, "dd/mm/yyyy"),
                          'invoice_due_date'  : convertUnixTStoDateFormat($invoice_due_date, "dd/mm/yyyy"),
                          'call_date'         : convertUnixTStoDateFormat($call_date, "dd/mm/yyyy"),
                          'call_number'       : $call_number,
                          'vehicle'           : $vehicle,
                          'vehicle_licenceplate' : $vehicle_licenceplate
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
                                      LOG.d(TAG, 'successfully deleted ' + filename);
                                    }
                                  });

                                  // ph.exit();
                                });
                              }
                            });

                            //ph.exit();
                          }
                        }); //end ph.create

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
