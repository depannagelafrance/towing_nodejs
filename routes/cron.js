// -- IMPORT LIBRARIES
var express     = require('express');
var nodemailer  = require('nodemailer');
var dateFormat  = require('dateformat');

var db        = require('../util/database.js');
var ju        = require('../util/json.js');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');

var company     = require('../model/company.js');

var settings    = require('../settings/settings.js');

const TAG = 'cron.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANTS
const SQL_FETCH_AWV_EXPORT_VOUCHERS = "CALL R_FETCH_AWV_WEEKLY_EXPORT_VOUCHERS(?); ";


// -- ONLY POSTS ARE ALLOWED
router.get('/', function($req, $res) {
  throw new common.InvalidRequest();
});


router.get('/weeklyAWVExport/:token', function($req, $res) {
  var $token      = ju.requires('token', $req.params);

  var xlsx = require('node-xlsx');
  var data = [];

  //lookup company
  company.findCurrentCompany($token, function($_company)
  {
    db.many(SQL_FETCH_AWV_EXPORT_VOUCHERS, [$token], function($error, $result, $fields) {
      var $headers = [];

      for(var $i = 0; $i < $fields[0].length; $i++) {
        var $field = $fields[0][$i];

        if($field)
          $headers.push($field.name);
      }

      data.push($headers);

      //201528_WO_Sanders_P3
      var $today = new Date();

      var $tab_name = dateFormat($today, "yyyyW") + "_WO_" + $_company.code;
      var $filename = $tab_name + ".xlsx";

      var transporter = nodemailer.createTransport(settings.smtp.transport);

      for(var $j = 0; $j < $result.length; $j++) {
        var $row = [];

        var $r = $result[$j];

        for(var $i = 0; $i < $fields[0].length; $i++) {
          var $field = $fields[0][$i];

          if($field)
            $row.push($r[$field.name]);
        }

        data.push($row);
      }

      // create XLS file
      var buffer = xlsx.build([{name: $tab_name, data: data}]); // returns a buffer


      // setup e-mail data with unicode symbols
      var mailOptions = {
          from: $_company.email, // sender address
          to: settings.awv.receivers, // list of receivers
          subject: 'Towing.be - ' + $_company.code + ' - Weekoverzicht takelbonnen ',  // Subject line
          html: 'Beste, <br /><br />'
              + 'In bijlage sturen wij graag het weekoverzicht van de F.A.S.T. takelwerkzaamheden:'
              + '<ul>'
              + '<li><strong>F.A.S.T. takeldienst: </strong>' + $_company.name + ' (' + $_company.code + ')'
              + '<li><strong>Weekoverzicht: </strong>' + dateFormat($today, "W/yyyy")
              + '</ul>'
              + 'Bij verdere vragen kan u steeds contact opnemen met: ' + $_company.email
              + '<br /><br/><br />Vriendelijke groet,<br>- ' + $_company.name + ' (Administratie)'
              + '<br /><br /><br />'
              + '<strong>Bijlagen:</strong><br /><ol>'
              + '<li>Overzicht:  ' + $filename + '</li>'
              + '</ol><br/><br/><br/>',
          attachments: [
            {   // base64 buffer as an attachment
                filename: $filename,
                content: buffer.toString('base64'),
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
  });

  ju.send($req, $res, {
    'result': 'ok'
  });
});



module.exports = router;
