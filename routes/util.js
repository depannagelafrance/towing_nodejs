// -- IMPORT LIBRARIES
require('../util/common.js');

var express   = require('express');
var util      = require('util');

var ju        = require('../util/json.js');
var LOG       = require('../util/logger.js');
var vies      = require('../util/vies.js');

var TAG = 'util.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- validate vat number
router.post('/vat', function($req, $res) {
  var $vat        = ju.requires('vat', $req.body);

  vies.checkVat($vat, function($result, $error) {
    if($error != null)
    {
      LOG.d(TAG, "invalid vat : " + $vat);
      LOG.d(TAG, "==> " + JSON.stringify($error));

      ju.send($req, $res, $error);
    }
    else
    {
      LOG.d(TAG, "Seems to be valid vat : " + $vat + " --> " + JSON.stringify($result));

      ju.send($req, $res, $result);
    }
  });
});


module.exports = router;
