var soap      = require('soap');
var _         = require('underscore');
var common    = require('../util/common.js');
var LOG       = require('../util/logger.js');
var settings  = require('../settings/settings.js');

const WSDL = settings.vies.wsdl;
const TAG = 'vies.js';

var checkVat = function($vat, cb)
{
  if(!$vat || $vat.length < 2)
  {
    LOG.d(TAG, "Invalid VAT number length: " + $vat)
    cb(null, new common.InvalidVatNumber($vat));
  }
  else
  {
    if(settings.vies.offline)
    {
      LOG.d(TAG, "VIES service offline, sending OK message");
      //the VIES webservice if offline, so allow any result
      cb({name: $vat, address: ''}, null);
    }
    else
    {
      LOG.d(TAG, "VIEW service online");
      $countryCode = $vat.substring(0,2);
      $vatNumber = $vat.substring(2);
      $vatNumber = $vatNumber.replace(/[^0-9A-Z]+/g, '');

      LOG.d(TAG, "--> Country: " + $countryCode);
      LOG.d(TAG, "--> vatNumber: " + $vatNumber);

      soap.createClient(WSDL, function(err, client) {
        try {
          client.checkVat({'countryCode': $countryCode, 'vatNumber': $vatNumber}, function(err, result){
            if(result.valid)
            {
              $_result = postProcessResult(result);

              LOG.d(TAG, "--> Valid result: " + JSON.stringify($_result));
              cb($_result, null);
            }
            else
            {
              LOG.d(TAG, "--> Invalid result: " + JSON.stringify(result));
              cb(null, new common.InvalidVatNumber($vat));
            }
          });
        } catch($error) {
          LOG.e(TAG, "--> Exception: " + JSON.stringify($error));
          cb(null, new common.InvalidVatNumber($vat));
        }
      });
    }
  }
}


function postProcessResult($result) {
  if($result) {
    if($result.address) {
      $_address = $result.address.split("\n");

      if($_address && $_address.length == 2) {
        $_street_and_nr = $_address[0].split(" ");
        $_zip_and_city  = $_address[1].split(" ");

        $_street  = null;
        $_nr      = null;
        $_zip     = null;
        $_city    = null;

        if($_street_and_nr.length >= 2) {
          $_street = _.first($_street_and_nr).trim();
          $_nr = _.rest($_street_and_nr).join(" ").trim();
        } else {
          $_street = $_address[0];
        }

        if($_zip_and_city.length >= 2) {
          $_zip = _.first($_zip_and_city);
          $_city = _.rest($_zip_and_city).join(" ").trim();
        } else {
          $$_city = $_address[1];
        }

        $result.address_data = {
          "street": $_street,
          "street_number": $_nr,
          "zip": $_zip,
          "city": $_city
        }

      }
    }
  }

  return $result;
}

exports.checkVat = checkVat;
