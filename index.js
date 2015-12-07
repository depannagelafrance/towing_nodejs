const TAG = 'index.js';

// -- IMPORT REQUIRED LIBARIES
var express     = require('express.io');
var bodyParser  = require('body-parser');
var morgan      = require('morgan');

var LOG         = require('./util/logger.js');

// -- CREATE APPLICATION AND ROUTING
var app = express();
app.http().io();

var router = express.Router();

app.use(morgan('dev'));

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false, limit: '50mb' }))

// parse application/json
app.use(bodyParser.json({limit: '50mb'}))


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
var doc       = require('./routes/document.js');
var profile   = require('./routes/profile.js');
var util      = require('./routes/util.js');
var invoice   = require('./routes/invoice.js');
var cron      = require('./routes/cron.js');


app.use('/',          index);
app.use('/vocab',     vocab);
app.use('/login',     login);
app.use('/dossier',   dossier);
app.use('/admin',     admin);
app.use('/report',    report);
app.use('/search',    search);
app.use('/document',  doc);
app.use('/me',        profile);
app.use('/util',      util);
app.use('/invoice',   invoice);
app.use('/cron',      cron);


// -- CONFIGURE ERROR HANDLING --

//production error handler
//no stacktraces leaked to user
app.use(function($err, $req, $res, next) {
    LOG.d(TAG,'Ai! This we like not!');

    LOG.e(TAG, $err);

    console.log($req.route);

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
