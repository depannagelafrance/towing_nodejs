var soap      = require('soap');
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
              LOG.d(TAG, "--> Valid result: " + JSON.stringify(result));
              cb(result, null);
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


exports.checkVat = checkVat;
