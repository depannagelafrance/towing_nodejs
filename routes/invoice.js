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
var dateutil    = require('../util/date.js');

var settings    = require('../settings/settings.js');

var company     = require('../model/company.js');
var dossier     = require('../model/dossier.js');


var TAG = 'invoice.js';

// -- CONFIGURE ROUTING
var router = express.Router();

//-- DEFINE CONSTANTS
const SQL_CREATE_EMPTY_INVOICE            = "CALL R_INVOICE_CREATE_EMPTY_INVOICE(?); ";
const SQL_CREATE_INVOICE_BATCH            = "CALL R_INVOICE_CREATE_BATCH(?); ";
const SQL_FETCH_COMPANY_INVOICES          = "CALL R_INVOICE_FETCH_COMPANY_INVOICES(?); ";
const SQL_FETCH_BATCH_RUNS                = "CALL R_INVOICE_FETCH_ALL_BATCH_RUNS(?); ";
const SQL_FETCH_BATCH_INVOICES            = "CALL R_INVOICE_FETCH_BATCH_INVOICES(?); ";
const SQL_FETCH_BATCH_INVOICE_LINES       = "CALL R_INVOICE_FETCH_BATCH_INVOICE_LINES(?,?); ";
const SQL_FETCH_INVOICE_BATCH_INFO        = "CALL R_FETCH_INVOICE_BATCH_INFO(?,?); ";

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
const SQL_START_INVOICE_BATCH_FOR_VOUCHER  = "CALL R_START_INVOICE_BATCH_FOR_VOUCHER(?,?,?,?); ";
const SQL_START_INVOICE_STORAGE_BATCH_FOR_VOUCHER  = "CALL R_START_INVOICE_STORAGE_BATCH_FOR_VOUCHER(?,?,?); ";
const SQL_INVOICE_ATT_LINK_WITH_DOCUMENT    = "CALL R_INVOICE_ATT_LINK_WITH_DOCUMENT(?,?,?); ";

const SQL_FETCH_INVOICE_BY_ID             = "CALL R_INVOICE_FETCH_COMPANY_INVOICE(?,?);";
const SQL_FETCH_INVOICE_CUSTOMER          = "CALL R_INVOICE_FETCH_COMPANY_INVOICE_CUSTOMER(?,?); ";
const SQL_FETCH_INVOICE_LINES_BY_INVOICE  = "CALL R_INVOICE_FETCH_COMPANY_INVOICE_LINES(?,?);";

const SQL_UPDATE_COMPANY_INVOICE          = "CALL R_INVOICE_UPDATE_INVOICE(?,?,?,?,?,?,?); ";
const SQL_UPDATE_COMPANY_INVOICE_CUSTOMER = "CALL R_INVOICE_UPDATE_INVOICE_CUSTOMER(?,?,?,?,?,?,?,?,?,?,?,?,?);";
const SQL_UPDATE_COMPANY_INVOICE_LINE     = "CALL R_INVOICE_UPDATE_INVOICE_LINE(?,?,?,?,?,?,?);";
const SQL_INVOICE_DELETE_INVOICE_LINE     = "CALL R_INVOICE_DELETE_INVOICE_LINE(?,?,?);";
const SQL_CREATE_COMPANY_INVOICE_LINE     = "CALL R_INVOICE_CREATE_INVOICE_LINE(?,?,?,?,?,?);";
const SQL_INVOICE_CREDIT_INVOICE          = "CALL R_INVOICE_CREDIT_INVOICE(?,?); ";


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

function findInvoiceById($invoice_id, $token, cb)
{
  db.one(SQL_FETCH_COMPANY_INVOICE, [$invoice_id, $token], function($error, $result, $fields) 
  {
    if($result && $result.id)
    {
      var $_invoice = $result;
      $_invoice.invoice_customer = {};
      $_invoice.invoice_lines = {};

      db.one(SQL_FETCH_INVOICE_CUSTOMER, [$invoice_id, $token], function($error, $result, $fields) {
        $_invoice.invoice_customer = $result;

        db.many(SQL_FETCH_INVOICE_LINES_BY_INVOICE, [$invoice_id, $token], function($error, $result, $fields) {
          $_invoice.invoice_lines = $result;
          $_invoice.invoice_ref = null;

          // if the invoice is a CN, then fetch the related invoice
          if($_invoice.invoice_type == 'CN')
          {
            db.one(SQL_FETCH_COMPANY_INVOICE, [$_invoice.invoice_ref_id, $token], function($error, $result, $fields) {
              $_invoice.invoice_ref = $result;

              cb($_invoice);

              // ju.send($req, $res, $_invoice);
            });
          }
          else
          {
            cb($_invoice);
            // ju.send($req, $res, $_invoice);
          }
        });
      });
    }
    else
    {
      throw new common.InvalidRequest();
    }
  });
}

router.get('/:invoice_id/:token', function($req, $res) {
  var $token        = ju.requires('token', $req.params);
  var $invoice_id   = ju.requiresInt('invoice_id', $req.params);

  findInvoiceById($invoice_id, $token, function($invoice) {
    ju.send($req, $res, $invoice);
  });
});


// update the invoice information
router.put('/:invoice_id/:token', function($req, $res) {
  var $token = ju.requires('token', $req.params);
  var $invoice_id = ju.requiresInt('invoice_id', $req.params);
  var $invoice = ju.requires('invoice', $req.body);

  var $invoice_params = [
      $invoice_id, //IN p_id BIGINT,
    	$invoice.invoice_structured_reference, //IN p_ref VARCHAR(20),
      $invoice.insurance_dossiernr, // IN p_insurance_dossiernr VARCHAR(45),
      $invoice.invoice_amount_paid, //IN p_paid DOUBLE(5,2),
      $invoice.invoice_payment_type, //IN p_ptype ENUM('OTHER','CASH','BANKDEPOSIT','MAESTRO','VISA','CREDITCARD'),
      $invoice.invoice_message, //IN p_message TEXT,
    	$token //IN p_token VARCHAR(255)
  ];

  db.one(SQL_UPDATE_COMPANY_INVOICE, $invoice_params, function($error, $result, $fields) {
    var $ic = $invoice.invoice_customer;

    var $customer_params = [
       $ic.id, //IN p_id 				BIGINT,
		   $ic.customer_number, //IN p_cust_number 	VARCHAR(45),
		   $ic.company_name, //IN p_company_name 	VARCHAR(255),
		   $ic.company_vat, //IN p_company_vat 	VARCHAR(45),
		   $ic.first_name, //IN p_first_name		VARCHAR(45),
       $ic.last_name, //IN p_last_name		VARCHAR(45),
       $ic.street, //IN p_street			VARCHAR(255),
       $ic.street_number, //IN p_street_nr		VARCHAR(45),
       $ic.street_pobox, //IN p_street_pobox	VARCHAR(45),
       $ic.zip, //IN p_zip				VARCHAR(45),
       $ic.city, //IN p_city			VARCHAR(45),
       $ic.country, //IN p_country			VARCHAR(255)
       $token
    ];

    db.one(SQL_UPDATE_COMPANY_INVOICE_CUSTOMER, $customer_params, function($error, $result, $fields) {
      var $i = 0;

      if($invoice.invoice_lines.length > 0)
      {
        $invoice.invoice_lines.forEach(function($item) {
          var $il_params = [
            $item.id, //IN p_id BIGINT,
            $invoice_id, //IN p_invoice_id BIGINT,
            $item.item, //IN p_item VARCHAR(255),
            $item.item_amount, //IN p_amount DOUBLE(5,2),
            $item.item_price_excl_vat, //IN p_price_excl_vat DOUBLE(5,2),
            $item.item_price_incl_vat, //IN p_price_incl_vat DOUBLE(5,2)
            $token
          ];

          $sql = SQL_UPDATE_COMPANY_INVOICE_LINE;


          //it's a new one
          if($item.id == null || $item.id == '')
          {
            $sql = SQL_CREATE_COMPANY_INVOICE_LINE;

            $il_params.shift();
          }

          db.one($sql, $il_params, function($error, $result, $fields) {
            $i++;

            if($i >= $invoice.invoice_lines.length) {
              ju.send($req, $res, 'ok');
            }
          });
        });
      }
      else
      {
        ju.send($req, $res, 'ok');
      }
    });
  });
});

router.delete('/:invoice_id/item/:item_id/:token', function($req, $res) {
  var $token = ju.requires('token', $req.params);
  var $invoice_id = ju.requiresInt('invoice_id', $req.params);
  var $item_id = ju.requiresInt('item_id', $req.params);

  db.one(SQL_INVOICE_DELETE_INVOICE_LINE, [$invoice_id, $item_id, $token], function($error, $result, $fields) {
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
// -- CREATE A NEW EMPTY INVOICE
//
router.post('/:token', function($req, $res) {
  var $token = ju.requires('token', $req.params);

  db.one(SQL_CREATE_EMPTY_INVOICE, [$token], function($error, $result, $fields) {
    findInvoiceById($result.id, $token,function($invoice) {
      ju.send($req, $res, $invoice);
    });
  });
});

//
// -- CREATE A NEW INVOICE  PDF
//
router.post('/render/:invoice_id/:token', function($req, $res) {
  var $invoice_id = ju.requires('invoice_id', $req.params);
  var $token = ju.requires('token', $req.params);

  company.findCurrentCompany($token, function($_company)
  {
    //start a new invoice batch
    db.one(SQL_FETCH_INVOICE_BY_ID, [$invoice_id, $token], function($error, $result, $fields) {
      createPDFInvoice($result, $_company, $token, $req, $res);
    });
  });

  ju.send($req, $res, {'result': 'ok'});
});

//
// -- CREDIT AN EXISTING INVOICE
//
router.post('/credit/:invoice_id/:token', function($req, $res) {
  var $invoice_id = ju.requires('invoice_id', $req.params);
  var $token = ju.requires('token', $req.params);

  db.one(SQL_INVOICE_CREDIT_INVOICE, [$invoice_id, $token], function($error, $result, $fields) {
    ju.send($req, $res, $result);

    company.findCurrentCompany($token, function($_company)
    {
      db.one(SQL_FETCH_INVOICE_BY_ID, [$result.id, $token], function($error, $result, $fields) {
        createPDFInvoice($result, $_company, $token, $req, $res);
        // processInvoiceData($result, {'invoice_batch_id' : $result.invoice_batch_run_id}, $_company, $token, $req, $res)
      });
    });
  });
});

function _raw($val) {
  if($val == null)
    return '';

  return $val;
}

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

    findInvoiceById($invoice_id, $token,function($invoice) {
      var $sale = $sales.e('Sale');
      var $customer = $customers.e('Customer');
      var $invoice_customer = $invoice.invoice_customer;

      // console.log($invoice);

      $j++;

      // -- -------------
      // -- SALES
      // -- -------------
      // $sale.e('Journal_Prime').r(_raw($invoice_customer.customer_number));
      $sale.e('Year_Alfa').r(_raw(formatTimestamp($invoice.invoice_date, 'yyyy')));// 2008
      //DocType
      // 30: Creditnota
      // 10: Factuur
      $sale.e('DocType').r(_raw($invoice.invoice_type == 'CN' ? 30 : 10));
      $sale.e('DocNumber').r(_raw($invoice.invoice_number));
      // $sale.e('AccountingPeriod').r(1);
      $sale.e('VATMonth').r(_raw(formatTimestamp($invoice.invoice_date, 'yyyymm'))); // 200801
      $sale.e('DocDate').r(_raw(convertUnixTStoDateFormat($invoice.invoice_date)));  // 10/01/2018
      $sale.e('DueDate').r(_raw(convertUnixTStoDateFormat($invoice.invoice_due_date)));  // 10/02/2018
      $sale.e('OurRef').r(_raw($invoice.invoice_number));   //
      $sale.e('YourRef').r('');  //
      $sale.e('Amount').r(_raw($invoice.invoice_total_excl_vat));  //
      $sale.e('CurrencyCode').r('EUR'); //
      $sale.e('VATAmount').r(_raw($invoice.invoice_total_vat));
      $sale.e('Ventil').r(4); //4: 21%


      // -- -------------
      // -- CUSTOMER
      // -- -------------
      $customer.e('Prime').r(_raw($invoice_customer.customer_number)); //customer_number
      if($invoice_customer.company_name != null && $invoice_customer.company_name != "")
      {
        $customer.e('Alfa').r(_raw($invoice_customer.company_name.substring(0,1).toUpperCase())); //customer_number
        $customer.e('Name').r(_raw($invoice_customer.company_name));
      }
      else
      {
        if($invoice_customer.last_name != null)
        {
          $customer.e('Alfa').r(_raw($invoice_customer.last_name.substring(0,1).toUpperCase())); //customer_number
          $customer.e('Name').r(_raw($invoice_customer.last_name + ' ' + $invoice_customer.first_name));
        }
      }

      $customer.e('Country').r(_raw($invoice_customer.country));
      $customer.e('Street').r(_raw($invoice_customer.street));
      $customer.e('HouseNumber').r(_raw($invoice_customer.street_number));
      $customer.e('MailboxNumber').r(_raw($invoice_customer.street_pobox));
      $customer.e('ZipCode').r(_raw($invoice_customer.zip));
      $customer.e('City').r(_raw($invoice_customer.city));
      $customer.e('Language').r(1); //1 = NL, 2 = FR, 3 = EN, 4 = DE
      $customer.e('CurrencyCode').r('EUR');

      $customer.e('VATNumber').r(_raw($invoice_customer.company_vat));

      if($invoice_customer.company_vat != null) {
        $customer.e('CountryVATNumber').r($invoice_customer.company_vat.substring(0,2).toUpperCase());

        //VATCode
        // 0 : niet btw plichtig
        // 1 : btw plichtig
        // 2 : kleine onderneming
        $customer.e('VATCode').r(_raw($invoice_customer.company_vat != null ? 1 : 0));
        //VATStatus
        // 0 : geen nummer
        // 1 : ondernemingsnummer
        // 2 : ondernemingsnummer in aanvraag
        // 3 : onbekend ondernemingsnummer
        // 4 : nationaal nummer
        // 5 : nationaal nummer in aanvraag
        // 6 : onbekend nationaal nummer
        $customer.e('VATStatus').r(_raw($invoice_customer.company_vat != null ? 1 : 0));
      }

      //Rappel
      // 0: geen betalingsherinnering
      // 1: standaard op papier
      // 2: standaard via e-mail
      $customer.e('Rappel').r(_raw(1));
      //Dom
      // 0: geen gedomicilieerde Facturen
      // 1: gedomicilieerde Facturen
      $customer.e('Dom').r(_raw(0));
      //Due
      // 0 : contant
      // 1 : eind maand
      // 2 : Factuurdatum
      // 3 : vrij ingave
      $customer.e('Due').r(_raw(0));

      //$customer.e('AccountSale').r(_raw('')); //de grootboekrekening waarop de klant meestal wordt tegengeboekt
      //$customer.e('GoodsCode').r(_raw('')); //de goederencode die meestal op de klant van toepassing is

      $sale.e('Customer_Prime').r(_raw($invoice_customer.customer_number));


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

  // var $customer_amount = ju.valueOf('customer_amount', $req.body);
  // var $customer_ptype = ju.valueOf('customer_ptype', $req.body);
  //
  // var $collector_amount = ju.valueOf('collector_amount', $req.body);
  // var $collector_ptype = ju.valueOf('collector_ptype', $req.body);
  //
  // var $assurance_amount = ju.valueOf('assurance_amount', $req.body);
  // var $assurance_ptype = ju.valueOf('assurance_ptype', $req.body);


  db.one(SQL_CREATE_INVOICE_BATCH_FOR_VOUCHER, [$voucher_id, $token], function($error, $batch_result, $fields) {
    if($batch_result && $batch_result.invoice_batch_id)
    {
      var $invoice_batch_id = $batch_result.invoice_batch_id;

      company.findCurrentCompany($token, function($_company)
      {
        //start a new invoice batch
        var $batch_params = [
          $voucher_id, $invoice_batch_id,
          // $customer_amount, $customer_ptype,
          // $collector_amount, $collector_ptype,
          // $assurance_amount, $assurance_ptype,
          $message,
          $token
        ];

        db.one(SQL_START_INVOICE_BATCH_FOR_VOUCHER, $batch_params, function($error, $result, $fields) {
          // processInvoiceData($result, $batch_result, $_company, $token, $req, $res);
          if($result.result && $result.result == 'VALIDATION_ERRORS') {
            ju.send($req, $res, {"result": "validation_errors"});
          } else {
            ju.send($req, $res, {"result": "ok", "invoice_batch_id": $batch_result.invoice_batch_id});
          }
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
  var $_invoice = $result;
  $_invoice.invoice_batch_id = $batch_result.invoice_batch_id;

  createPDFInvoice($_invoice, $_company, $token, $req, $res);
}

function createPDFInvoice($invoice, $_company, $token, $req, $res)
{
    var $invoice_due_date     = $invoice.invoice_due_date;
    var $invoice_id           = $invoice.id;

    //when the batch is completed, fetch the invoices from the batch
    //open the template
    var $filename='./templates/invoice/';

    if($invoice.invoice_type == 'CN') {
      $filename += 'cn.html';
    } else {
      $filename += 'invoice.html';
    }

    fs.readFile($filename, 'utf8', function($err, $data)
    {
      if($err)
      { 
        LOG.d(TAG, JSON.stringify($err));
        throw $err;
      }
      //fetch the invoice customer
      db.one(SQL_FETCH_INVOICE_CUSTOMER, [$invoice_id, $token], function($error, $invoice_customer, $fields)
      {
        //fetch the invoice lines for each fetched invoice
        var $_invoice = $invoice;
        $_invoice.customer = $invoice_customer;

        db.many(SQL_FETCH_INVOICE_LINES_BY_INVOICE, [$invoice_id, $token], function($error, $invoice_lines, $fields)
        {
          $_invoice.invoice_lines = $invoice_lines;

          // console.log($invoice);

          //create a new invoice pdf
          var $template = _.template($data);

          var $template_vars = {
            'company'           : $_company,
            'invoice'           : $_invoice,
            'invoice_date'      : convertUnixTStoDateFormat($_invoice.invoice_date, "dd/mm/yyyy"),
            'invoice_due_date'  : convertUnixTStoDateFormat($_invoice.invoice_due_date, "dd/mm/yyyy")
          };

          if($invoice.towing_voucher_id)
          {
            var $batch_info_params = [$invoice_id, $token];

            if($invoice.invoice_type == 'CN') {
              $batch_info_params = [$invoice.invoice_ref_id, $token];
            }

            db.one(SQL_FETCH_INVOICE_BATCH_INFO, $batch_info_params, function($error, $batch_info, $fields) {
              $template_vars.call_date = $batch_info.call_date;
              $template_vars.call_number = $batch_info.call_number;
              $template_vars.vehicule = $batch_info.vehicule + ' ' + $batch_info.vehicule_type;
              $template_vars.vehicule_licenceplate = $batch_info.vehicule_licenceplate;
              $template_vars.default_depot = $batch_info.default_depot;
              $template_vars.vehicule_collected = $batch_info.vehicule_collected;

              $_invoice.dossier_id = $batch_info.dossier_id;
              $_invoice.towing_voucher_id = $batch_info.towing_voucher_id;

              renderInvoicePdf($template, $template_vars, $_invoice, $_company, $token, $req, $res);
            });
          }
          else
          {
            renderInvoicePdf($template, $template_vars, $_invoice, $_company, $token, $req, $res);
          }
        });
      });
    });
  // }
}

function renderInvoicePdf($template, $template_vars, $_invoice, $_company, $token, $req, $res)
{
  var $compiled_template = $template($template_vars);

  var filename = $_invoice.filename; //'invoice_' + $_invoice.invoice_number + ".pdf";
  //compile the template
  var folder = settings.fs.invoice_store;

  LOG.d(TAG, 'Setting location to :' + folder + filename);

  phantom.create(function (error, ph)
  {
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
              if($_invoice.towing_voucher_id != null)
              {
                db.one(SQL_ADD_ATTACHMENT_TO_VOUCHER, [$_invoice.towing_voucher_id, filename, "application/pdf", data.length, data, $token], function($error, $att, $fields)
                {
                  db.one(SQL_INVOICE_ATT_LINK_WITH_DOCUMENT, [$_invoice.id, $att.document_id, $token], function($error, $result, fields){});
                });

                fetchTowingVoucherReportAndMail($_invoice, data, $_company, $token, $req, $res);
              }

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
}

function fetchTowingVoucherReportAndMail($_invoice, $_invoice_data, $_company, $token, $req, $res) {
  // console.log($_invoice);

  //CREATE A TOWING VOUCHER PDF AND SEND IT TO AWV
  dossier.createTowingVoucherReport($_invoice.dossier_id, $_invoice.towing_voucher_id, 'towing', $token, $req, $res, function($towing_voucher_filename, $towing_voucher_base64, $dossier)
  {
    //send mail if linked to a towing voucher
    if($_invoice.towing_voucher_id != null)
    {
      sendEmailToAWV($_invoice, $_invoice_data, $_company, $dossier, $towing_voucher_filename, $towing_voucher_base64)
    }
  });
}

function sendEmailToAWV($_invoice, $_invoice_data, $_company, $dossier, $towing_voucher_filename, $towing_voucher_base64)
{
  var $_invoice_type = 'Factuur';
  // create reusable transporter object using SMTP transport
  var transporter = nodemailer.createTransport(settings.smtp.transport);

  if($_invoice.invoice_type == 'CN') {
    $_invoice_type = 'Creditnota';
  }

  // setup e-mail data with unicode symbols
  var mailOptions = {
      from: $_company.email, // sender address
      to: settings.awv.receivers, // list of receivers
      subject: 'Towing.be - ' + $_company.code + ' - Takelbon ' + $_invoice.voucher_number + ' en ' + $_invoice_type + ' ' + $_invoice.invoice_number_display, // Subject line
      html: 'Beste, <br /><br />'
          + 'In bijlage sturen wij graag de informatie met betrekking tot volgende F.A.S.T. takeling:'
          + '<ul>'
          + '<li><strong>F.A.S.T. takeldienst: </strong>' + $_company.name + ' (' + $_company.code + ')'
          + '<li><strong>Takelbon: </strong>' + $_invoice.voucher_number + '</li>'
          + '<li><strong>' + $_invoice_type + ' nummer: </strong>' + $_invoice.invoice_number_display + '</li>'
          + '<li><strong>Datum oproep: </strong>' + dateutil.convertUnixTStoDateTimeFormat($dossier.call_date_ts) + '</li>'
          + '<li><strong>Oproepnummer: </strong>' + $dossier.call_number + '</li>'
          + '</ul>'
          + 'Bij verdere vragen kan u steeds contact opnemen met: ' + $_company.email
          + '<br /><br/><br />Vriendelijke groet,<br>- ' + $_company.name + ' (Administratie)'
          + '<br /><br /><br />'
          + '<strong>Bijlagen:</strong><br /><ol>'
          + '<li>' + $_invoice_type + ':  ' + $_invoice.filename + '</li>'
          + '<li>Takelbon: ' + $towing_voucher_filename + '</li>'
          + '</ol><br/><br/><br/>',
      attachments: [
        {   // base64 buffer as an attachment
            filename: $_invoice.filename,
            content: $_invoice_data,
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
  transporter.sendMail(mailOptions, function(error, info)
  {
      if(error){
          LOG.e(TAG, error);
      }else{
          LOG.d(TAG, "E-mail verzonden naar: " + settings.awv.receivers);
      }
  });
}

function convertUnixTStoDateFormat($unix_ts)
{
  return formatTimestamp($unix_ts, "dd/mm/yyyy");
}

function formatTimestamp($unix_ts, $format)
{
  if($unix_ts)
  {
    $_date = new Date($unix_ts * 1000);

    return dateFormat($_date, $format);
  }

  return "";
}


module.exports = router;
