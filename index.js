const TAG = 'index.js';

// -- IMPORT REQUIRED LIBARIES
var express     = require('express');
var bodyParser  = require('body-parser');
var LOG         = require('./util/logger.js');

// -- CREATE APPLICATION AND ROUTING
var app = express();
var router = express.Router();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

// parse application/vnd.api+json as json
app.use(bodyParser.json({ type: 'application/vnd.api+json' }))

app.use(function (req, res, next) {
  LOG.d(TAG, ">>> BODY ========================");
  LOG.d(TAG, JSON.stringify(req.body));
  LOG.d(TAG, "<<< BODY ========================");
  next();
})

// -- CONFIGURE THE ROUTES --
var index     = require('./routes/index.js');
var login     = require('./routes/login.js');
var dossier   = require('./routes/dossier.js');
var admin     = require('./routes/admin.js');
var report    = require('./routes/report.js');
var search    = require('./routes/search.js');
var vocab     = require('./routes/vocab.js');


app.use('/',        index);
app.use('/vocab',   vocab);
app.use('/login',   login);
app.use('/dossier', dossier);
app.use('/admin',   admin);
app.use('/report',  report);
app.use('/search',  search);



// -- CONFIGURE ERROR HANDLING --

//production error handler
//no stacktraces leaked to user
app.use(function($err, $req, $res, next) {
    LOG.d(TAG,'Ai! This we like not!');

    LOG.e(TAG, $err);

    $res.status($err.statusCode || 500);

    $errormsg = JSON.stringify({
        statusCode: $err.statusCode || 500,
        message: $err.message,
        error: {}
    });

    LOG.d(TAG,$errormsg);

    $res.end($errormsg);
});

// -- START THE SERVER --
app.listen(8443);
LOG.d(TAG,'server is running');
