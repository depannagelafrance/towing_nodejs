var express = require('express');
var router = express.Router();
var db = require('../util/database.js');

/* GET home page. */
router.get('/', function(req, res) {
  db.one("SELECT 'GinTonic time' AS DoYouKnowTheTime;", [], function($error, $rows, $fields) {
      res.end(JSON.stringify($rows));
  });
});

module.exports = router;
