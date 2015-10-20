// -- IMPORT LIBRARIES
var _ = require('underscore');
var express = require('express');
var nodemailer = require('nodemailer');

var db = require('../util/database.js');
var ju = require('../util/json.js');
var common = require('../util/common.js');
var LOG = require('../util/logger.js');
var vies = require('../util/vies.js');
var vocab = require('../model/vocab.js');
var company = require('../model/company.js');
var settings = require('../settings/settings.js');


const TAG = 'admin.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANTS
const SQL_CREATE_USER = "CALL R_CREATE_USER(?, ?, ?, ?, ?, ?, ?, ?);";
const SQL_UPDATE_USER = "CALL R_UPDATE_USER(?, ?, ?, ?, ?, ?, ?, ?);";
const SQL_USER_BY_ID = "CALL R_FETCH_USER_BY_ID(?,?);";
const SQL_ALL_USERS = "CALL R_FETCH_ALL_USERS(?);";
const SQL_UNLOCK_USER = "CALL R_UNLOCK_USER(?, ?);";
const SQL_DELETE_USER = "CALL R_DELETE_USER(?, ?);";
const SQL_PURGE_ROLES = "CALL R_PURGE_USER_ROLES(?, ?);";
const SQL_ASSIGN_ROLE = "CALL R_ASSIGN_USER_ROLE(?, ?, ?);";
const SQL_ALL_USER_ROLES = "CALL R_FETCH_ALL_USER_ROLES(?,?);";
const SQL_ALL_AVAILABLE_ROLES = "CALL R_FETCH_AVAILABLE_ROLES(?);";


// -- ONLY POSTS ARE ALLOWED
router.get('/', function ($req, $res) {
    throw new common.InvalidRequest();
});

// -- PROCESS LOGIN
router.post('/', function ($req, $res) {
    throw new common.InvalidRequest();
});

// -- -------------------------------------------------
// -- USER MANAGEMENT
// -- -------------------------------------------------
// FETCH OVERVIEW OF USERS
router.get('/users/:token', function ($req, $res) {
    var $token = $req.params.token;

    db.many(SQL_ALL_USERS, [$token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/roles/:token', function ($req, $res) {
    var $token = $req.params.token;

    db.many(SQL_ALL_AVAILABLE_ROLES, [$token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

//FETCH INFORMATION OF A SPECIFIC USER
router.get('/users/:user_id/:token', function ($req, $res) {
    var $id = $req.params.user_id;
    var $token = $req.params.token;

    db.one(SQL_USER_BY_ID, [$id, $token], function ($error, $result, $fields) {
        db.many(SQL_ALL_USER_ROLES, [$result.id, $token], function ($error, $r_result, $fields) {
            $result.user_roles = $r_result;

            ju.send($req, $res, $result);
        });
    });
});

//CREATE NEW USER
router.post('/users/:token', function ($req, $res) {
    var $token = $req.params.token;

    var $login = ju.requires('login', $req.body);
    var $firstname = ju.requires('firstname', $req.body);
    var $lastname = ju.requires('lastname', $req.body);
    var $email = ju.requires('email', $req.body);
    var $roles = ju.requires('user_roles', $req.body);
    var $is_signa = ju.intValueOf('is_signa', $req.body) == 1;
    var $is_towing = ju.intValueOf('is_towing', $req.body) == 1;
    var $vehicule = ju.intValueOf('vehicle_id', $req.body);

    if (_.isArray($roles)) {
        if (!$roles || $roles.length <= 0) {
            //throw new common.InvalidRequest();
            $roles = [];
        }


        db.one(SQL_CREATE_USER, [$login, $firstname, $lastname, $email, $is_signa, $is_towing, $vehicule, $token], function ($error, $result, $fields) {
            if ('error' in $result) {
                ju.send($req, $res, $result);
            } else {
                var $id = $result.id;

                var $generated_pwd = $result.generated_password;

                // create reusable transporter object using SMTP transport
                var transporter = nodemailer.createTransport(settings.smtp.transport);

                // setup e-mail data with unicode symbols
                var mailOptions = {
                    from: settings.smtp.from, // sender address
                    to: $email, // list of receivers
                    subject: 'Towing.be - Uw wachtwoord', // Subject line
                    html: 'Hallo <b>' + $firstname + '</b>. <br /><br />'
                    + 'We hebben een account aangemaakt op https://tool.towing.be. <br /><br />'
                    + '- Gebruikersnaam: <strong>' + $login + '</strong> <br />'
                    + '- Wachtwoord: <strong>' + $generated_pwd + '</strong><br/><br />'
                    + 'Moest je nog vragen hebben, neem dan contact op met info@towing.be. <br /><br />'
                    + 'Vriendelijke groet,<br>- Towing.be Adminstratie'
                };

                // send mail with defined transport object
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        LOG.e(TAG, error);
                    } else {
                        LOG.d(TAG, "E-mail verzonden naar: " + $email);
                    }
                });


                db.one(SQL_USER_BY_ID, [$id, $token], function ($error, $result, $fields) {
                    $user = $result;

                    db.one(SQL_PURGE_ROLES, [$id, $token], function ($error, $result, $fields) {
                        for ($i = 0; $i < $roles.length; $i++) {
                            db.one(SQL_ASSIGN_ROLE, [$id, $roles[$i], $token], function ($error, $result, $fields) {
                            });
                        }

                        db.many(SQL_ALL_USER_ROLES, [$id, $token], function ($error, $result, $fields) {
                            $user['user_roles'] = $result;

                            ju.send($req, $res, $user);
                        });
                    });
                });
            }
        });
    } else {
        throw new common.InvalidRequest();
    }
});

//UPDATE EXISTING USER
router.put('/users/:user_id/:token', function ($req, $res) {
    var $token = $req.params.token;

    var $user_id = ju.requires('user_id', $req.params)
    var $login = ju.requires('login', $req.body);
    var $firstname = ju.requires('firstname', $req.body);
    var $lastname = ju.requires('lastname', $req.body);
    var $email = ju.requires('email', $req.body);
    var $roles = ju.requires('user_roles', $req.body);
    var $is_towing = (ju.intValueOf('is_towing', $req.body) == 1);
    var $is_signa = (ju.intValueOf('is_signa', $req.body) == 1);
    var $vehicule = ju.intValueOf('vehicle_id', $req.body);
    var $licence_plate = ju.valueOf('licence_plate', $req.body);

    if (_.isArray($roles)) {
        if (!$roles || $roles.length <= 0) {
            //throw new common.InvalidRequest();
            $roles = [];
        }


        db.one(SQL_UPDATE_USER, [$user_id, $firstname, $lastname, $email, $is_signa, $is_towing, $vehicule, $token], function ($error, $result, $fields) {
            if (!$result || 'error' in $result) {
                ju.send($req, $res, $result);
            } else {
                var $id = $result.id;

                db.one(SQL_USER_BY_ID, [$id, $token], function ($error, $result, $fields) {
                    $user = $result;

                    db.one(SQL_PURGE_ROLES, [$id, $token], function ($error, $result, $fields) {
                        for ($i = 0; $i < $roles.length; $i++) {
                            db.one(SQL_ASSIGN_ROLE, [$id, $roles[$i], $token], function ($error, $result, $fields) {
                            });
                        }

                        db.many(SQL_ALL_USER_ROLES, [$id, $token], function ($error, $result, $fields) {
                            $user['user_roles'] = $result;

                            ju.send($req, $res, $user);
                        });
                    });
                });
            }
        });
    } else {
        throw new common.InvalidRequest();
    }
});

//DELETE USER
router.delete('/users/:user_id/:token', function ($req, $res) {
    var $id = $req.params.user_id;
    var $token = $req.params.token;

    db.one(SQL_DELETE_USER, [$id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

//REACTIVATE USER
router.put('/users/reactivate/:user_id/:token', function ($req, $res) {
    ju.send($req, $res, {"statusCode": 500, "message": "Missing Implementation"});
});

//UNLOCK A TEMPORARILY LOCKED USER
router.put('/users/unlock/:user_id/:token', function ($req, $res) {
    var $id = $req.params.user_id;
    var $token = $req.params.token;

    db.one(SQL_UNLOCK_USER, [$id, $token], function ($error, $result, $fields) {
        if ('error' in $result) {
            ju.send($req, $res, $result);
        } else {
            db.one(SQL_USER_BY_ID, [$id, $token], function ($error, $result, $fields) {
                ju.send($req, $res, $result);
            });
        }
    });
});

// -- -------------------------------------------------
// -- CALENDAR MANAGEMENT
// -- -------------------------------------------------
const SQL_CREATE_CALENDAR_ITEM = "CALL R_ADD_CALENDAR_ITEM(?,from_unixtime(?),?);";
const SQL_UPDATE_CALENDAR_ITEM = "CALL R_UPDATE_CALENDAR_ITEM(?,?,?,?);";
const SQL_DELETE_CALENDAR_ITEM = "CALL R_DELETE_CALENDAR_ITEM(?,?);";
const SQL_ALL_CALENDAR_ITEMS = "CALL R_FETCH_ALL_CALENDAR_ITEMS(?,?);";
const SQL_CALENDAR_ITEM_BY_ID = "CALL R_CALENDAR_ITEM_BY_ID(?,?);";

router.get('/calendar/year/:year/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    $year = ju.requiresInt('year', $req.params);

    db.many(SQL_ALL_CALENDAR_ITEMS, [$year, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/calendar/id/:id/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    var $id = ju.requiresInt('id', $req.params);

    db.one(SQL_CALENDAR_ITEM_BY_ID, [$id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.post('/calendar/:token', function ($req, $res) {
    var $token = $req.params.token;

    var $name = ju.requires('name', $req.body);
    var $date = ju.requires('date', $req.body);

    db.one(SQL_CREATE_CALENDAR_ITEM, [$name, $date, $token], function ($error, $result, $fields) {
        if ('error' in $result) {
            ju.send($req, $res, $result);
        } else {
            var $id = $result.id;

            db.one(SQL_CALENDAR_ITEM_BY_ID, [$id, $token], function ($error, $result, $fields) {
                ju.send($req, $res, $result);
            });
        }
    });
});

router.put('/calendar/:id/:token', function ($req, $res) {
    var $id = ju.requiresInt('id', $req.params);
    var $token = $req.params.token;

    var $name = ju.requires('name', $req.body);
    var $date = ju.requires('date', $req.body);

    db.one(SQL_UPDATE_CALENDAR_ITEM, [$id, $name, $date, $token], function ($error, $result, $fields) {
        if ('error' in $result) {
            ju.send($req, $res, $result);
        } else {
            var $id = $result.id;

            db.one(SQL_CALENDAR_ITEM_BY_ID, [$id, $token], function ($error, $result, $fields) {
                ju.send($req, $res, $result);
            });
        }
    });
});

router.delete('/calendar/:id/:token', function ($req, $res) {
    var $id = ju.requiresInt('id', $req.params);
    var $token = $req.params.token;

    db.one(SQL_DELETE_CALENDAR_ITEM, [$id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});


// -- -------------------------------------------------
// -- CUSTOMER MANAGEMENT
// -- -------------------------------------------------

const SQL_ALL_CUSTOMERS = "CALL R_FETCH_ALL_CUSTOMERS(?);";
const SQL_CUSTOMER_BY_ID = "CALL R_FETCH_CUSTOMER_BY_ID(?,?);";
const SQL_CREATE_CUSTOMER = "CALL R_ADD_CUSTOMER(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";
const SQL_UPDATE_CUSTOMER = "CALL R_UPDATE_CUSTOMER(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";
const SQL_DELETE_CUSTOMER = "CALL R_DELETE_CUSTOMER(?,?);";

router.get('/customer/:token', function ($req, $res) {
    var $token = $req.params.token;

    db.many(SQL_ALL_CUSTOMERS, [$token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/customer/:id/:token', function ($req, $res) {
    var $id = $req.params.id;
    var $token = $req.params.token;

    db.one(SQL_CUSTOMER_BY_ID, [$id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.post('/customer/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $name = ju.requires('company_name', $req.body);
    var $vat = ju.valueOf('company_vat', $req.body);
    var $first_name = ju.valueOf('first_name', $req.body);
    var $last_name = ju.valueOf('last_name', $req.body);
    var $street = ju.valueOf('street', $req.body);
    var $street_number = ju.valueOf('street_number', $req.body);
    var $street_pobox = ju.valueOf('street_pobox', $req.body);
    var $city = ju.valueOf('city', $req.body);
    var $zip = ju.valueOf('zip', $req.body);
    var $country = ju.valueOf('country', $req.body);
    var $customer_number = ju.valueOf('customer_number', $req.body);
    var $type = ju.valueOf('type', $req.body);
    var $invoice_excluded = ju.intValueOf('invoice_excluded', $req.body);
    var $is_insurance = ju.intValueOf('is_insurance', $req.body);
    var $is_collector = ju.intValueOf('is_collector', $req.body);

    vies.checkVat($vat, function ($result, $error) {
        if (!$error) {
            if (!$name || $name == '') {
                $name = $result.name;
            }

            if (!$street || $street == '') {
                if ($result.address_data) {
                    $street = $result.address_data.street;
                    $street_number = $result.address_data.street_number;
                    $zip = $result.address_data.zip;
                    $city = $result.address_data.city;
                    $country = $result.address_data.country;
                } else {
                    $street = $result.address;
                }
            }

            /**
             IN p_type ENUM('CUSTOMER', 'COLLECTOR', 'INSURANCE', 'OTHER'),
             IN p_customer_number VARCHAR(45),
             IN p_name VARCHAR(255), IN p_vat VARCHAR(45),
             IN p_first_name VARCHAR(255), IN p_last_name VARCHAR(255),
             IN p_street VARCHAR(255), IN p_street_number VARCHAR(45), IN p_street_pobox VARCHAR(45), IN p_zip VARCHAR(45), IN p_city VARCHAR(45), IN p_country VARCHAR(255),
             IN p_invoice_excluded TINYINT(1), IN p_is_insurance TINYINT(1), IN p_is_collector TINYINT(1),
             IN p_token VARCHAR(255)
             */

            db.one(SQL_CREATE_CUSTOMER, ['CUSTOMER', $customer_number,
                $name, $vat,
                $first_name, $last_name,
                $street, $street_number, $street_pobox, $city, $zip, $country,
                $invoice_excluded, $is_insurance, $is_collector,
                $token], function ($error, $result, $fields) {
                ju.send($req, $res, $result);
            });
        }
        else {
            ju.send($req, $res, $error);
        }
    });


});

router.put('/customer/:id/:token', function ($req, $res) {
    var $id = ju.requiresInt('id', $req.params);
    var $token = ju.requires('token', $req.params);
    var $name = ju.requires('company_name', $req.body);
    var $vat = ju.valueOf('company_vat', $req.body);
    var $first_name = ju.valueOf('first_name', $req.body);
    var $last_name = ju.valueOf('last_name', $req.body);
    var $street = ju.valueOf('street', $req.body);
    var $street_number = ju.valueOf('street_number', $req.body);
    var $street_pobox = ju.valueOf('street_pobox', $req.body);
    var $city = ju.valueOf('city', $req.body);
    var $zip = ju.valueOf('zip', $req.body);
    var $country = ju.valueOf('country', $req.body);
    var $customer_number = ju.valueOf('customer_number', $req.body);
    var $type = ju.valueOf('type', $req.body);
    var $invoice_excluded = ju.intValueOf('invoice_excluded', $req.body);
    var $is_insurance = ju.intValueOf('is_insurance', $req.body);
    var $is_collector = ju.intValueOf('is_collector', $req.body);

    vies.checkVat($vat, function ($result, $error) {
        if (!$error) {
            /**
             IN p_id BIGINT,
             IN p_customer_number VARCHAR(45),
             IN p_name VARCHAR(255), IN p_vat VARCHAR(45),
             IN p_first_name VARCHAR(255), IN p_last_name VARCHAR(255),
             IN p_street VARCHAR(255), IN p_street_number VARCHAR(45), IN p_street_pobox VARCHAR(45), IN p_zip VARCHAR(45), IN p_city VARCHAR(45), IN p_country VARCHAR(255),
             IN p_invoice_excluded TINYINT(1), IN p_is_insurance TINYINT(1), IN p_is_collector TINYINT(1),
             IN p_token VARCHAR(255)
             */

            db.one(SQL_UPDATE_CUSTOMER, [$id, $customer_number, $name, $vat,
                $first_name, $last_name,
                $street, $street_number, $street_pobox, $city, $zip, $country,
                $invoice_excluded, $is_insurance, $is_collector,
                $token], function ($error, $result, $fields) {
                ju.send($req, $res, $result);
            });
        }
        else {
            ju.send($req, $res, $error);
        }
    });
});

router.delete('/customer/:id/:token', function ($req, $res) {
    var $id = $req.params.id;
    var $token = $req.params.token;

    db.one(SQL_DELETE_CUSTOMER, [$id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

// -- -------------------------------------------------
// -- TIMEFRAME ACTIVITY MANAGEMENT
// -- -------------------------------------------------
const SQL_UPDATE_TIMEFRAME_ACTIVITY_FEE = "CALL R_UPDATE_TIMEFRAME_ACTIVITY_FEE(?,?,?,?,?);";

router.get('/timeframe/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    vocab.findAllTimeframes($token, function ($result) {
        ju.send($req, $res, $result);
    });
});

router.get('/timeframe/activities/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    vocab.findAllTimeframeActivities($token, function ($result) {
        ju.send($req, $res, $result);
    });
});

router.get('/timeframe/activity/:timeframe/fees/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $timeframe_id = ju.requiresInt('timeframe', $req.params);

    vocab.findAllTimeframeActivityFees($timeframe_id, $token, function ($result) {
        ju.send($req, $res, $result);
    });
});


router.put('/timeframe/activity/:timeframe/fees/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $timeframe_id = ju.requiresInt('timeframe', $req.params);
    var $fees = ju.requires('activity_fees', $req.body);


    var $i = 0;

    $fees.forEach(function ($fee) {
        var $ta_id = ju.requiresInt('timeframe_activity_id', $fee);
        var $fee_excl_vat = ju.requires('fee_excl_vat', $fee);
        var $fee_incl_vat = ju.requires('fee_incl_vat', $fee);

        db.one(SQL_UPDATE_TIMEFRAME_ACTIVITY_FEE, [$timeframe_id, $ta_id, $fee_excl_vat, $fee_incl_vat, $token], function ($error, $result, $fields) {
            $i++;

            if ($i >= $fees.length) {
                vocab.findAllTimeframeActivityFees($timeframe_id, $token, function ($result) {
                    ju.send($req, $res, $result);
                });
            }
        });
    });
});


// -- -------------------------------------------------
// -- COMPANY MANAGEMENT
// -- -------------------------------------------------
const SQL_FETCH_COMPANY_DEPOT = "CALL R_FETCH_COMPANY_DEPOT(?);";
const SQL_UPDATE_COMPANY = "CALL R_UPDATE_USER_COMPANY(?,?,?,?,?,?,?,?,?,?,?,?,?);";
const SQL_UPDATE_COMPANY_DEPOT = "CALL R_UPDATE_COMPANY_DEPOT(?,?,?,?,?,?,?);";
const SQL_UPDATE_COMPANY_TAB_ID = "CALL R_UPDATE_COMPANY_MOBILE_DEVICE(?,?);";

router.get('/company/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    company.findCurrentCompany($token, function ($result) {
        ju.send($req, $res, $result);
    });
});

router.put('/company/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    var $company = ju.requires('company', $req.body);

    vies.checkVat($company.vat, function ($result, $error) {
        if (!$error) {
            var params = [
                $company.name,
                $company.code,
                $company.street,
                $company.street_number,
                $company.street_pobox,
                $company.zip,
                $company.city,
                $company.phone,
                $company.fax,
                $company.email,
                $company.website,
                $company.vat,
                $token
            ];

            db.one(SQL_UPDATE_COMPANY, params, function ($error, $result, $fields) {
                ju.send($req, $res, $result);
            });
        }
        else {
            ju.send($req, $res, $error);
        }
    });
});

router.put('/company/mobile/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $regid = ju.requires('registration_id', $req.body);

    var params = [
        $regid,
        $token
    ];

    db.one(SQL_UPDATE_COMPANY_TAB_ID, params, function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/company/depot/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    db.one(SQL_FETCH_COMPANY_DEPOT, [$token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.put('/company/depot/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    var $depot = ju.requires('depot', $req.body);

    var params = [
        $depot.name,
        $depot.street,
        $depot.street_number,
        $depot.street_pobox,
        $depot.zip,
        $depot.city,
        $token
    ];

    db.one(SQL_UPDATE_COMPANY_DEPOT, params, function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});


// -- -------------------------------------------------
// -- VEHICLE MANAGEMENT
// -- -------------------------------------------------

const SQL_ALL_VEHICLES = "CALL R_FETCH_ALL_VEHICLES(?);";
const SQL_VEHICLE_BY_ID = "CALL R_FETCH_VEHICLE_BY_ID(?,?);";
const SQL_CREATE_VEHICLE = "CALL R_CREATE_VEHICLE(?,?,?,?);";
const SQL_UPDATE_VEHICLE = "CALL R_UPDATE_VEHICLE(?,?,?,?,?);";
const SQL_DELETE_VEHICLE = "CALL R_DELETE_VEHICLE(?,?);";

router.get('/vehicle/:token', function ($req, $res) {
    var $token = $req.params.token;

    db.many(SQL_ALL_VEHICLES, [$token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/vehicle/:id/:token', function ($req, $res) {
    var $id = $req.params.id;
    var $token = $req.params.token;

    db.one(SQL_VEHICLE_BY_ID, [$id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.post('/vehicle/:token', function ($req, $res) {
    var $token = $req.params.token;

    var $name = ju.requires('name', $req.body);
    var $licence_plate = ju.requires('licence_plate', $req.body);
    var $type = ju.requires('type', $req.body);

    db.one(SQL_CREATE_VEHICLE, [$name, $licence_plate, $type, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.put('/vehicle/:id/:token', function ($req, $res) {
    var $id = ju.requiresInt('id', $req.params);
    var $token = ju.requires('token', $req.params);

    var $name = ju.requires('name', $req.body);
    var $licence_plate = ju.requires('licence_plate', $req.body);
    var $type = ju.requires('type', $req.body);


    db.one(SQL_UPDATE_VEHICLE, [$id, $name, $licence_plate, $type, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.delete('/vehicle/:id/:token', function ($req, $res) {
    var $id = ju.requiresInt('id', $req.params);
    var $token = $req.params.token;

    db.one(SQL_DELETE_VEHICLE, [$id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});


module.exports = router;
