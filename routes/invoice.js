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
var JSZip       = require('jszip');
var xmlbuilder  = require('xmlbuilder');
var nodemailer  = require('nodemailer');

var db          = require('../util/database.js');
var ju          = require('../util/json.js');
var LOG         = require('../util/logger.js');
var settings    = require('../settings/settings.js');

var company     = require('../model/company.js');
var dossier     = require('../model/dossier.js');


var TAG = 'invoice.js';

// -- CONFIGURE ROUTING
var router = express.Router();

//-- DEFINE CONSTANST
const SQL_CREATE_INVOICE_BATCH            = "CALL R_INVOICE_CREATE_BATCH(?); ";
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
const SQL_START_INVOICE_BATCH_FOR_VOUCHER  = "CALL R_START_INVOICE_BATCH_FOR_VOUCHER(?,?,?,?,?,?,?,?,?,?); ";
const SQL_START_INVOICE_STORAGE_BATCH_FOR_VOUCHER  = "CALL R_START_INVOICE_STORAGE_BATCH_FOR_VOUCHER(?,?,?); ";
const SQL_INVOICE_ATT_LINK_WITH_VOUCHER    = "CALL R_INVOICE_ATT_LINK_WITH_VOUCHER(?,?,?); ";


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
router.post('/export/expertm/:token', function($req, $res) {
  var $selected_ids = ju.requires('invoices', $req.body);
  var $token        = ju.requires('token', $req.params);
  var $i = 0;

  var $invoice_builder = xmlbuilder.create('ImportExpMPlus');
  var $customer_builder = xmlbuilder.create('ImportExpMPlus');


  var $sales = $invoice_builder.e('Sales');
  var $customers = $customer_builder.e('Customers');
  var $j = 0;

  var zip = new JSZip();

  for($i = 0; $i < $selected_ids.length; $i++)
  {
    var $invoice_id = $selected_ids[$i];

    //fetch the invoice
    db.one(SQL_FETCH_COMPANY_INVOICE, [$invoice_id, $token], function($error, $invoice, $fields)
    {
      var $sale = $sales.e('Sale')
      $sale.e('Year_Alfa').r(2008) ;// 2008
      $sale.e('DocNumber').r($invoice.invoice_number);
      $sale.e('AccountingPeriod').r(1);
      $sale.e('VATMonth').r($invoice.invoice_date); // 200801
      $sale.e('DocDate').r($invoice.invoice_date);  // 10/01/2018
      $sale.e('DueDate').r($invoice.invoice_date);  // 10/02/2018
      $sale.e('OurRef').r($invoice.invoice_number);   //
      $sale.e('YourRef').r('');  //
      $sale.e('Amount').r($invoice.invoice_total_excl_vat);  //
      $sale.e('CurrencyCode').r('EUR'); //
      $sale.e('VATAmount').r($invoice.invoice_total_vat);

      //fetch the invoice customer
      db.one(SQL_FETCH_BATCH_INVOICE_CUSTOMER, [$invoice.id, $invoice.invoice_batch_run_id], function($error, $invoice_customer, $fields)
      {
        $j++;

        var $customer = $customers.e('Customer');
        $customer.e('Prime').r($invoice_customer.customer_number); //customer_number
        $customer.e('Name').r($invoice_customer.company_name);
        $customer.e('Country').r($invoice_customer.country == null ? '' : $invoice_customer.country);
        $customer.e('Street').r($invoice_customer.street);
        $customer.e('HouseNumber').r($invoice_customer.street_number);
        $customer.e('MailboxNumber').r($invoice_customer.street_pobox == null ? '' : $invoice_customer.street_pobox);
        $customer.e('ZipCode').r($invoice_customer.zip);
        $customer.e('City').r($invoice_customer.city);
        $customer.e('Language').r(2);
        $customer.e('CurrencyCode').r('EUR');
        $customer.e('CountryVATNumber').r('BE');
        $customer.e('VATNumber').r($invoice_customer.company_vat);

        $sale.e('Customer_Prime').r($invoice_customer.customer_number);


        //fetch the invoice lines
        // db.many(SQL_FETCH_BATCH_INVOICE_LINES, [$invoice.id, $invoice.invoice_batch_run_id], function($error, $invoice_lines, $fields)
        // {
          //add to the xml file
          if($j >= $selected_ids.length) {
            // ju.send($req, $res, {"result": "ok"});

            //create a new zip
            //put the XML file in the zip file
            //send the zip back as base64

            zip.file('Klanten.xml', $customer_builder.end({pretty: true}));
            zip.file('Facturen.xml', $invoice_builder.end({pretty: true}));

            // LOG.d(TAG, $invoice_builder.end({pretty: true}));
            // LOG.d(TAG, $customer_builder.end({pretty: true}));

            ju.send($req, $res, {
              'base64': zip.generate({type:'base64'}),
              'name': 'Export.zip'
            });
          }
        // });
      });
    });
  }
});


//
//-- CREATE A NEW INVOICE FOR A VOUCHER
//
router.post('/voucher/:voucher_id/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);
  var $voucher_id   = ju.requiresInt('voucher_id', $req.params);
  var $message      = ju.valueOf('message', $req.body);

  var $customer_amount = ju.valueOf('customer_amount', $req.body);
  var $customer_ptype = ju.valueOf('customer_ptype', $req.body);

  var $collector_amount = ju.valueOf('collector_amount', $req.body);
  var $collector_ptype = ju.valueOf('collector_ptype', $req.body);

  var $assurance_amount = ju.valueOf('assurance_amount', $req.body);
  var $assurance_ptype = ju.valueOf('assurance_ptype', $req.body);


  db.one(SQL_CREATE_INVOICE_BATCH_FOR_VOUCHER, [$voucher_id, $token], function($error, $batch_result, $fields) {
    if($batch_result && $batch_result.invoice_batch_id)
    {
      var $invoice_batch_id = $batch_result.invoice_batch_id;

      company.findCurrentCompany($token, function($_company)
      {
        //start a new invoice batch
        var $batch_params = [
          $voucher_id, $invoice_batch_id,
          $customer_amount, $customer_ptype,
          $collector_amount, $collector_ptype,
          $assurance_amount, $assurance_ptype,
          $message,
          $token
        ];

        db.one(SQL_START_INVOICE_BATCH_FOR_VOUCHER, $batch_params, function($error, $result, $fields) {
          processInvoiceData($result, $batch_result, $_company, $token, $req, $res);
        });
      });
    }
  });
});


//
//-- CREATE A NEW STORAGE INVOICE FOR A VOUCHER
//
router.post('/storage/:voucher_id/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);
  var $voucher_id   = ju.requiresInt('voucher_id', $req.params);

  db.one(SQL_CREATE_INVOICE_BATCH_FOR_VOUCHER, [$voucher_id, $token], function($error, $batch_result, $fields) {
    if($batch_result && $batch_result.invoice_batch_id)
    {
      var $invoice_batch_id = $batch_result.invoice_batch_id;

      company.findCurrentCompany($token, function($_company)
      {
        //start a new invoice batch
        db.one(SQL_START_INVOICE_STORAGE_BATCH_FOR_VOUCHER, [$voucher_id, $invoice_batch_id, $token], function($error, $result, $fields) {
          processInvoiceData($result, $batch_result, $_company, $token, $req, $res)
        });
      });
    }
  });
});


function processInvoiceData($result, $batch_result, $_company, $token, $req, $res)
{
  if($result.result && $result.result == 'VALIDATION_ERRORS') {
    ju.send($req, $res, {"result": "validation_errors"});
  } else {
    ju.send($req, $res, {"result": "ok", "invoice_batch_id": $batch_result.invoice_batch_id});

    var $invoice_batch_id     = $batch_result.invoice_batch_id;
    var $call_date            = $result.call_date;
    var $call_number          = $result.call_number;
    var $vehicle              = $result.vehicule + ' ' + $result.vehicule_type;
    var $vehicle_licenceplate = $result.vehicule_licenceplate;
    var $invoice_due_date     = $result.invoice_due_date;
    var $default_depot        = $result.default_depot;
    var $vehicule_collected   = $result.vehicule_collected;

    // create reusable transporter object using SMTP transport
    var transporter = nodemailer.createTransport(settings.smtp.transport);

    //when the batch is completed, fetch the invoices from the batch
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
                    'vehicle_licenceplate' : $vehicle_licenceplate,
                    'default_depot'     : $default_depot,
                    'vehicule_collected': $vehicule_collected
                  });

                  var filename = $_invoice.filename; //'invoice_' + $_invoice.invoice_number + ".pdf";

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
                          fs.readFile(folder + filename, "base64", function(a_error, data)
                          {
                            db.one(SQL_ADD_ATTACHMENT_TO_VOUCHER, [$_invoice.towing_voucher_id, filename, "application/pdf", data.length, data, $token], function($error, $att, $fields) {
                              db.one(SQL_INVOICE_ATT_LINK_WITH_VOUCHER, [$_invoice.id, $att.document_id, $token], function($error, $result, fields){});
                            });

                            //CREATE A TOWING VOUCHER PDF AND SEND IT TO AWV
                            dossier.createTowingVoucherReport($_invoice.dossier_id, $_invoice.towing_voucher_id, 'towing', $token, $res, $res, function($towing_voucher_filename, $towing_voucher_base64)
                            {
                              // setup e-mail data with unicode symbols
                              var mailOptions = {
                                  from: $_company.email, // sender address
                                  to: settings.awv.receivers, // list of receivers
                                  subject: 'Towing.be - ' + $_company.code + ' - Takelbon ' + $_invoice.voucher_number + ' en Factuur ' + $_invoice.invoice_number_display, // Subject line
                                  html: 'Beste, <br /><br />'
                                      + 'In bijlage sturen wij graag de informatie met betrekking tot volgende F.A.S.T. takeling:'
                                      + '<ul>'
                                      + '<li><strong>F.A.S.T. takeldienst: </strong>' + $_company.name + ' (' + $_company.code + ')'
                                      + '<li><strong>Takelbon: </strong>' + $_invoice.voucher_number + '</li>'
                                      + '<li><strong>Factuur nummer: </strong>' + $_invoice.invoice_number_display + '</li>'
                                      + '<li><strong>Datum oproep: </strong>' + convertUnixTStoDateTimeFormat($_invoice.call_date) + '</li>'
                                      + '<li><strong>Oproepnummer: </strong>' + $_invoice.call_number + '</li>'
                                      + '</ul>'
                                      + 'Bij verdere vragen kan u steeds contact opnemen met: ' + $_company.email
                                      + '<br /><br/><br />Vriendelijke groet,<br>- ' + $_company.name + ' (Administratie)'
                                      + '<br /><br /><br />'
                                      + '<strong>Bijlagen:</strong><br /><ol>'
                                      + '<li>Factuur:  ' + $_invoice.filename + '</li>'
                                      + '<li>Takelbon: ' + $towing_voucher_filename + '</li>'
                                      + '</ol><br/><br/><br/>',
                                  attachments: [
                                    {   // base64 buffer as an attachment
                                        filename: $_invoice.filename,
                                        content: data,
                                        encoding: "base64"
                                    },
                                    {   // base64 buffer as an attachment
                                        filename: $towing_voucher_filename,
                                        content: $towing_voucher_base64,
                                        encoding: "base64"
                                    }
                                  ]
                              };

                              // send mail with defined transport object
                              transporter.sendMail(mailOptions, function(error, info){
                                  if(error){
                                      LOG.e(TAG, error);
                                  }else{
                                      LOG.d(TAG, "E-mail verzonden naar: " + settings.awv.receivers);
                                  }
                              });
                            });

                            // delete the file
                            fs.unlink(folder + filename, function (err) {
                              if (err) {
                                LOG.e(TAG, "Could not delete file: " + JSON.stringify(err));
                              } else {
                                LOG.d(TAG, 'successfully deleted ' + folder + filename);
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
  }
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

function convertUnixTStoDateTimeFormat($unix_ts)
{
  if($unix_ts)
  {
    $_date = new Date($unix_ts * 1000);

    return dateFormat($_date, "dd/mm/yyyy HH:MM");
  }

  return "";
}

module.exports = router;
