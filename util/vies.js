var soap = require('soap');
var common = require('../util/common.js');

var $wsdl = "http://ec.europa.eu/taxation_customs/vies/checkVatService.wsdl";

var checkVat = function($vat, cb)
{
  if(!$vat || $vat.length < 2)
  {
    cb(null, new common.InvalidVatNumber($vat));
  }
  else
  {
    $countryCode = $vat.substring(0,2);
    $vatNumber = $vat.substring(2);
    $vatNumber = $vatNumber.replace(/[^0-9]+/g, '');

    soap.createClient($wsdl, function(err, client) {
      try {
        client.checkVat({'countryCode': $countryCode, 'vatNumber': $vatNumber}, function(err, result){
          if(result.valid)
          {
            cb(result, null);
          }
          else
          {
            cb(null, new common.InvalidVatNumber($vat));
          }
        });
      } catch($error) {
        cb(null, new common.InvalidVatNumber($vat));
      }
    });
  }
}

exports.checkVat = checkVat;
