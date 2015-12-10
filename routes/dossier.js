// -- IMPORT LIBRARIES
require('../util/common.js');

var _ = require('underscore');
var express = require('express');
var util = require('util');
var nodemailer = require('nodemailer');
var fs = require('fs');
var path = require('path');
var phantom = require('node-phantom-simple');
var dateFormat = require('dateformat');
var uuid = require('node-uuid');

var db = require('../util/database.js');
var ju = require('../util/json.js');
var LOG = require('../util/logger.js');
var agent = require('../util/push.js');
var vies = require('../util/vies.js');
var dateutil = require('../util/date.js');

var company = require('../model/company.js');
var dossier = require('../model/dossier.js');
var vocab = require('../model/vocab.js');

var settings = require('../settings/settings.js');


var TAG = 'dossier.js';

// -- CONFIGURE ROUTING
var router = express.Router();


//-- DEFINE CONSTANST
const SQL_CREATE_DOSSIER = "CALL R_CREATE_DOSSIER(?);";
const SQL_UPDATE_DOSSIER = "CALL R_UPDATE_DOSSIER(?, ?, ?, ?, ?, ?, ?, ?, ?);";
const SQL_UPDATE_VOUCHER_COLLECTION_INFO = "CALL R_UPDATE_VOUCHER_COLLECTION_INFO(?,?,from_unixtime(?),?); ";

const SQL_CREATE_TOWING_VOUCHER = "CALL R_CREATE_TOWING_VOUCHER(?, ?); ";
const SQL_MARK_VOUCHER_AS_IDLE = "CALL R_MARK_VOUCHER_AS_IDLE(?,?); ";
const SQL_MARK_VOUCHER_AS_CLOSED = "CALL R_MARK_VOUCHER_AS_CLOSED(?,?); ";
const SQL_APPROVE_VOUCHER = "CALL R_APPROVE_VOUCHER(?,?); ";

const SQL_UPDATE_TOWING_VOUCHER = "CALL R_UPDATE_TOWING_VOUCHER("
    + "?," //p_dossier_id
    + "?," //p_voucher_id
    + "?," //p_insurance_id
    + "?," //p_insurance_dossier_nr
    + "?," //p_insurance_invoice_number
    + "?," //p_warranty_holder
    + "?," //p_collector_id
    + "?," //p_vehicule
    + "?," //p_vehicule_type
    + "?," //p_vehicule_color
    + "?," //p_keys_present
    + "?," //p_vehicule_licence_plate
    + "?," //p_vehicule_country
    + "?," //p_vehicule_impact_remarks
    + "?," //p_signa_id
    + "?," //p_signa_by
    + "?," //p_signa_by_vehicule
    + "from_unixtime(?)," //p_signa_arrival
    + "?," //p_towing_id
    + "?," //p_towed_by
    + "?," //p_towing_vehicle_id
    + "?," //p_towed_by_vehicule
    + "from_unixtime(?)," //p_towing_called
    + "from_unixtime(?)," //p_towing_arrival
    + "from_unixtime(?)," //p_towing_start
    + "from_unixtime(?)," //p_towing_end
    + "?," //p_police_name
    + "from_unixtime(?)," //p_police_signature
    + "from_unixtime(?)," //p_recipient_signature
    + "from_unixtime(?)," //p_vehicule_collected
    + "?," //p_causer_not_present
    + "?," //p_police_not_present
    + "from_unixtime(?)," //p_cic
    + "?," //p_additional_info
    + "?"  //p_token
    + ");";

const SQL_PURGE_DOSSIER_TRAFFIC_LANES = "CALL R_PURGE_DOSSIER_TRAFFIC_LANES(?,?);";
const SQL_CREATE_DOSSIER_TRAFFIC_LANES = "CALL R_CREATE_DOSSIER_TRAFFIC_LANES(?,?,?);";

//const SQL_FETCH_DOSSIER_BY_ID                         = "CALL R_FETCH_DOSSIER_BY_ID(?,?)";
const SQL_FETCH_DOSSIER_BY_NUMBER = "CALL R_FETCH_DOSSIER_BY_NUMBER(?, ?);";
//const SQL_FETCH_TOWING_VOUCHERS_BY_DOSSIER            = "CALL R_FETCH_TOWING_VOUCHERS_BY_DOSSIER(?,?)";
//const SQL_FETCH_TOWING_ACTIVITES_BY_VOUCHER           = "CALL R_FETCH_TOWING_ACTIVITIES_BY_VOUCHER(?, ?, ?);";
//const SQL_FETCH_TOWING_PAYMENTS_BY_VOUCHER            = "CALL R_FETCH_TOWING_PAYMENTS_BY_VOUCHER(?, ?, ?); ";
const SQL_FETCH_ALL_DOSSIERS_BY_FILTER = "CALL R_FETCH_ALL_DOSSIERS_BY_FILTER(?,?);";
const SQL_FETCH_ALL_DOSSIERS_ASSIGNED_TO_ME_BY_FILTER = "CALL R_FETCH_ALL_DOSSIERS_ASSIGNED_TO_ME_BY_FILTER(?,?);"
const SQL_FETCH_ALL_AVAILABLE_ACTIVITIES = "CALL R_FETCH_ALL_AVAILABLE_ACTIVITIES(?, ?, ?);";
const SQL_FETCH_ALL_VOUCHER_ACTIVITIES = "CALL R_FETCH_ALL_TOWING_ACTIVITIES(?, ?, ?);";
const SQL_FETCH_ALL_VOUCHERS_BY_FILTER = "CALL R_FETCH_ALL_VOUCHERS_BY_FILTER(?, ?); ";
const SQL_FETCH_ALL_ALLOTMENTS_BY_DIRECTION = "CALL R_FETCH_ALL_ALLOTMENTS_BY_DIRECTION(?,?,?); ";
const SQL_FETCH_ALL_COMPANIES_BY_ALLOTMENT = "CALL R_FETCH_ALL_COMPANIES_BY_ALLOTMENT(?,?); ";
const SQL_FETCH_ALL_DOSSIER_TRAFFIC_LANES = "CALL R_FETCH_ALL_DOSSIER_TRAFFIC_LANES(?,?);";
const SQL_FETCH_TOWING_PAYMENT_DETAILS_BY_VOUCHER = "CALL R_FETCH_TOWING_PAYMENT_DETAILS_BY_VOUCHER(?,?); ";

const SQL_FETCH_TOWING_DEPOT = "CALL R_FETCH_TOWING_DEPOT(?, ?); ";
const SQL_UPDATE_TOWING_DEPOT = "CALL R_UPDATE_TOWING_DEPOT(?,?,?,?,?,?,?,?,?,?); ";
const SQL_UPDATE_TOWING_DEPOT_TO_AGENCY = "CALL R_UPDATE_TOWING_DEPOT_TO_AGENCY(?,?,?);";

const SQL_FETCH_CUSTOMER = "CALL R_FETCH_TOWING_CUSTOMER(?, ?); ";
const SQL_UPDATE_TOWING_CUSTOMER = "CALL R_UPDATE_TOWING_CUSTOMER(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";
const SQL_UPDATE_TOWING_CUSTOMER_TO_AGENCY = "CALL R_UPDATE_TOWING_CUSTOMER_TO_AGENCY(?,?);";

const SQL_FETCH_CAUSER = "CALL R_FETCH_TOWING_CAUSER(?, ?); ";
const SQL_UPDATE_TOWING_CAUSER = "CALL R_UPDATE_TOWING_CAUSER(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?);";

const SQL_UPDATE_TOWING_VOUCHER_ACTIVITY = "CALL R_UPDATE_TOWING_VOUCHER_ACTIVITY(?,?,?,?);";
const SQL_REMOVE_TOWING_VOUCHER_ACTIVITY = "CALL R_REMOVE_TOWING_VOUCHER_ACTIVITY(?,?,?);";
const SQL_UPDATE_TOWING_VOUCHER_PAYMENTS = "CALL R_UPDATE_TOWING_VOUCHER_PAYMENTS(?,?,?);";
const SQL_UPDATE_TOWING_VOUCHER_PAYMENT_DETAILS = "CALL R_UPDATE_TOWING_VOUCHER_PAYMENT_DETAILS("
    + "?," //IN p_id BIGINT,
    + "?," //IN p_tvp_id BIGINT,
    + "?," //IN p_foreign_vat BOOL,
    + "?," //IN p_amount_excl_vat DOUBLE(10,2),
    + "?," //IN p_amount_incl_vat DOUBLE(10,2),
    + "?," //IN p_amount_paid_cash DOUBLE(10,2),
    + "?," //IN p_amount_paid_bankdeposit DOUBLE(10,2),
    + "?," //IN p_amount_paid_maestro DOUBLE(10,2),
    + "?," //IN p_amount_paid_visa DOUBLE(10,2),
    + "?);"; //IN p_token VARCHAR(255)";

const SQL_UPDATE_TOWING_VOUCHER_ADDITIONAL_COST = "CALL R_UPDATE_TOWING_ADDITIONAL_COST(?, ?, ?, ?, ?, ?); ";
const SQL_REMOVE_TOWING_VOUCHER_ADDITIONAL_COST = "CALL R_REMOVE_TOWING_ADDITIONAL_COST(?, ?, ?); ";
const SQL_FETCH_ALL_TOWING_VOUCHER_ADDITIONAL_COSTS = "CALL R_FETCH_ALL_TOWING_ADDITIONAL_COSTS(?, ?); ";

const SQL_ADD_BLOB = "CALL R_ADD_BLOB(?,?,?,?,?); ";
const SQL_ADD_COLLECTOR_SIGNATURE = "CALL R_ADD_COLLECTOR_SIGNATURE(?,?,?,?,?,?);";
const SQL_ADD_CAUSER_SIGNATURE = "CALL R_ADD_CAUSER_SIGNATURE(?,?,?,?,?);";
const SQL_ADD_POLICE_SIGNATURE = "CALL R_ADD_POLICE_SIGNATURE(?,?,?,?,?);";
const SQL_ADD_INSURANCE_DOCUMENT = "CALL R_ADD_INSURANCE_DOCUMENT(?,?,?,?,?,?);";
const SQL_ADD_ANY_DOCUMENT = "CALL R_ADD_ANY_DOCUMENT(?,?,?,?,?,?)";
const SQL_ADD_VEHICLE_DAMAGE_DOCUMENT = "CALL R_ADD_VEHICLE_DAMAGE_DOCUMENT(?,?,?,?,?,?)";
const SQL_FETCH_ALL_VOUCHER_ATTACHMENTS = "CALL R_FETCH_ALL_VOUCHER_DOCUMENTS(?, ?); ";
const SQL_REMOVE_TOWING_VOUCHER_ATTACHMENT = "CALL R_REMOVE_TOWING_VOUCHER_ATTACHMENT(?,?,?);";

const SQL_LINK_AWV_LETTER_BATCH_WITH_VOUCHER = "CALL R_LINK_AWV_LETTER_BATCH_WITH_VOUCHER(?,?,?); ";
const SQL_ADD_AWV_LETTER_BATCH = "CALL R_ADD_AWV_LETTER_BATCH(?,?); ";
const SQL_FETCH_ALL_AWV_DOCUMENTS = "CALL R_FETCH_ALL_AWV_DOCUMENTS(?); ";

const SQL_FETCH_ALL_INTERNAL_COMMUNICATION = "CALL R_FETCH_ALL_INTERNAL_COMMUNICATIONS(?,?,?); ";
const SQL_FETCH_ALL_EMAIL_COMMUNICATION = "CALL R_FETCH_ALL_EMAIL_COMMUNICATIONS(?,?,?); ";
const SQL_FETCH_ALL_EMAIL_RECIPIENTS = "CALL R_FETCH_ALL_DOSSIER_COMM_RECIPIENTS(?,?); ";
const SQL_ADD_DOSSIER_COMMUNICATION = "CALL R_CREATE_DOSSIER_COMMUNICATION(?,?,?,?,?,?); ";
const SQL_ADD_DOSSIER_COMM_RECIPIENT = "CALL R_CREATE_DOSSIER_COMM_RECIPIENT(?, ?, ?, ?); ";
const SQL_CREATE_TOWING_LOCATION_TRACKING = "CALL R_CREATE_TOWING_LOCATION_TRACKING(?,?,from_unixtime(?),?,?,?);";

const SQL_ADD_ATTACHMENT_TO_VOUCHER = "CALL R_ADD_ANY_DOCUMENT("
    + "?," //voucher_id
    + "?," //filename
    + "?," //content type
    + "?," //file size
    + "?," //content
    + "?);"; //token

const SQL_FETCH_USER_BY_ID = "CALL R_FETCH_USER_BY_ID(?,?);";

const SQL_FETCH_ALL_VOUCHER_VALIDATION_MESSAGES = "CALL R_FETCH_ALL_VOUCHER_VALIDATION_MESSAGES(?,?);";

const SQL_FETCH_VOUCHER_AWAITING_APPROVAL_FOR_EXPORT = "CALL R_FETCH_VOUCHER_AWAITING_APPROVAL_FOR_EXPORT(?); ";
const SQL_FETCH_VOUCHER_APPROVED_BY_AWV = "CALL R_FETCH_VOUCHERS_APPROVED_BY_AWV(?); ";

const STATUS_ALL = "ALL";
const STATUS_NEW = "NEW";
const STATUS_IN_PROGRESS = "IN PROGRESS";
const STATUS_COMPLETED = "CLOSED";
const STATUS_TO_CHECK = "TO CHECK";
const STATUS_READY_FOR_INVOICE = "READY FOR INVOICE";
const STATUS_INVOICED = "INVOICED";
const STATUS_NOT_COLLECTED = "NOT COLLECTED";
const STATUS_AGENCY = "AGENCY";
const STATUS_AWAITING_AWV_APPROVAL = "AWAITING_AWV_APPROVAL"
const STATUS_AWV_APPROVED = "AWV_APPROVED";


const PAGESETTINGS = {
    general: {
        loadImages: false,
        localToRemoteUrlAccessEnabled: false,
        javascriptEnabled: false,
        loadPlugins: false,
        quality: 10
    },
    viewport: {
        width: 800,
        height: 600
    },
    paper: {
        format: 'A4', orientation: 'portrait', border: '0.5cm'
    }
};


var listDossiers = function ($req, $res, $status) {
    var $token = ju.requires('token', $req.params);

    //fetch the towing activities information
    db.many(SQL_FETCH_ALL_DOSSIERS_BY_FILTER, [$status, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
}

//-- FETCH THE DOSSIERS
router.get('/:token', function ($req, $res) {
    listDossiers($req, $res, STATUS_ALL);
});

router.get('/list/new/:token', function ($req, $res) {
    listDossiers($req, $res, STATUS_NEW);
});

//overview of dossiers/vouchers assigned to current user
router.get('/list/me/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    //fetch the towing activities information
    db.many(SQL_FETCH_ALL_DOSSIERS_ASSIGNED_TO_ME_BY_FILTER, [STATUS_NEW, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/list/check/:token', function ($req, $res) {
    listDossiers($req, $res, STATUS_TO_CHECK);
});

router.get('/list/invoice/:token', function ($req, $res) {
    listDossiers($req, $res, STATUS_READY_FOR_INVOICE);
});

router.get('/list/invoiced/:token', function ($req, $res) {
    listDossiers($req, $res, STATUS_INVOICED);
});

router.get('/list/awaiting_awv_approval/:token', function ($req, $res) {
    listDossiers($req, $res, STATUS_AWAITING_AWV_APPROVAL);
});

router.get('/list/awv_approved/:token', function ($req, $res) {
    listDossiers($req, $res, STATUS_AWV_APPROVED);
});

router.get('/list/done/:token', function ($req, $res) {
    listDossiers($req, $res, STATUS_COMPLETED);
});

router.get('/list/not_collected/:token', function ($req, $res) {
    listDossiers($req, $res, STATUS_NOT_COLLECTED);
});

router.get('/list/agency/:token', function ($req, $res) {
    listDossiers($req, $res, STATUS_AGENCY);
});

router.get('/list/vouchers/new/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    db.many(SQL_FETCH_ALL_VOUCHERS_BY_FILTER, [STATUS_NEW, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/list/vouchers/completed/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    db.many(SQL_FETCH_ALL_VOUCHERS_BY_FILTER, [STATUS_COMPLETED, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/list/available_activities/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    //fetch the towing activities information
    db.many(SQL_FETCH_ALL_AVAILABLE_ACTIVITIES, [$dossier_id, $voucher, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/list/activities/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    //fetch the towing activities information
    db.many(SQL_FETCH_ALL_VOUCHER_ACTIVITIES, [$dossier_id, $voucher, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/list/additional_costs/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    //fetch the towing activities information
    db.many(SQL_FETCH_ALL_TOWING_VOUCHER_ADDITIONAL_COSTS, [$voucher_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/list/payment_details/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    //fetch the towing activities information
    db.many(SQL_FETCH_TOWING_PAYMENT_DETAILS_BY_VOUCHER, [$voucher_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/list/available_allotments/direction/:direction/:token', function ($req, $res) {
    var $direction = ju.requiresInt('direction', $req.params);
    var $token = ju.requires('token', $req.params);

    db.many(SQL_FETCH_ALL_ALLOTMENTS_BY_DIRECTION, [$direction, null, $token], function ($error, $result, $fields) {
        if ($result && !('error' in $result) && $result.length > 0) {
            $allotments = [];

            $result.forEach(function ($allotment) {
                db.many(SQL_FETCH_ALL_COMPANIES_BY_ALLOTMENT, [$allotment.id, $token], function ($error, $a_result, $fields) {
                    $allotment.towing_services = $a_result;

                    $allotments.push($allotment);

                    if ($allotments.length == $result.length) {
                        ju.send($req, $res, $allotments);
                    }
                });
            });
        }
        else {
            ju.send($req, $res, $result);
        }
    });
});

router.get('/list/available_allotments/direction/:direction/indicator/:indicator/:token', function ($req, $res) {
    var $direction = ju.requiresInt('direction', $req.params);
    var $indicator = $req.params.indicator;
    var $token = ju.requires('token', $req.params);

    db.many(SQL_FETCH_ALL_ALLOTMENTS_BY_DIRECTION, [$direction, $indicator, $token], function ($error, $result, $fields) {
        if ($result && !('error' in $result) && $result.length > 0) {
            $allotments = [];


            $result.forEach(function ($allotment) {
                db.many(SQL_FETCH_ALL_COMPANIES_BY_ALLOTMENT, [$allotment.id, $token], function ($error, $a_result, $fields) {
                    $allotment.towing_services = $a_result;

                    $allotments.push($allotment);

                    if ($allotments.length == $result.length) {
                        ju.send($req, $res, $allotments);
                    }
                });
            });
        }
        else {
            ju.send($req, $res, $result);
        }
    });
});

router.get('/list/traffic_posts/allotment/:allotment_id/:token', function ($req, $res) {
    var $allotment_id = ju.requiresInt('allotment_id', $req.params);
    var $token = ju.requires('token', $req.params);

    vocab.findAllTrafficPostsByAllotment($allotment_id, $token, function ($result) {
        ju.send($req, $res, $result);
    });
});

router.get('/list/traffic_lanes/:dossier_id/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier_id', $req.params);
    var $token = ju.requires('token', $req.params);

    db.many(SQL_FETCH_ALL_DOSSIER_TRAFFIC_LANES, [$dossier_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/list/awv/letter/batches/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    db.many(SQL_FETCH_ALL_AWV_DOCUMENTS, [$token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});


// -- GET A DOSSIER BY ID
function fetchDossierById($req, $res, $dossier_id, $token) {
    dossier.findById($dossier_id, $token, function ($dossier) {
        ju.send($req, $res, {'dossier': $dossier});
    });
}

router.get('/:dossier/:token', function ($req, $res) {
    var $dossier_id = $req.params.dossier;
    var $token = $req.params.token;

    fetchDossierById($req, $res, $dossier_id, $token);
});


router.get('/find/dossier_number/:dossier/:token', function ($req, $res) {
    var $dossier_nr = ju.requiresInt('dossier', $req.params);
    var $token = ju.requires('token', $req.params);

    //fetch the towing activities information
    db.one(SQL_FETCH_DOSSIER_BY_NUMBER, [$dossier_nr, $token], function ($error, $result, $fields) {
        if ('error' in $result) {
            ju.send($req, $res, $result);
        } else {
            fetchDossierById($req, $res, $result.id, $token);
        }
    });
});

// -- CREATE DOSSIER, TOWING VOUCHER
router.post('/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    db.one(SQL_CREATE_DOSSIER, [$token], function ($error, $result, $fields) {
        if ($result && 'error' in $result) {
            ju.send($req, $res, $result);
        } else {
            fetchDossierById($req, $res, $result.id, $token);
        }
    });
});

// -- CREATE VOUCHER
router.post('/voucher/:dossier_id/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier_id', $req.params);
    var $token = ju.requires('token', $req.params);

    db.one(SQL_CREATE_TOWING_VOUCHER, [$dossier_id, $token], function ($error, $result, $fields) {
        if ($result && 'error' in $result) {
            ju.send($req, $res, $result);
        } else {
            fetchDossierById($req, $res, $dossier_id, $token);
        }
    });
});

router.post('/voucher/idle/:voucher_id/:token', function ($req, $res) {
    var $voucher_id = ju.requiresInt('voucher_id', $req.params);
    var $token = ju.requires('token', $req.params);

    db.one(SQL_MARK_VOUCHER_AS_IDLE, [$voucher_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    })
});

router.post('/voucher/approve/:voucher_id/:token', function ($req, $res) {
    var $voucher_id = ju.requiresInt('voucher_id', $req.params);
    var $token = ju.requires('token', $req.params);

    db.one(SQL_APPROVE_VOUCHER, [$voucher_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    })
});

// -- CREATE VOUCHER ATTACHMENT
router.post('/voucher/attachment/:category/:voucher_id/:token', function ($req, $res) {
    var $voucher_id = ju.requiresInt('voucher_id', $req.params);
    var $token = ju.requires('token', $req.params);
    var $category = ju.requires('category', $req.params);
    var $file_name = "";
    var $name = "";

    var $sql = "";

    //validate incomming category
    switch ($category) {
        case 'signature_police':
            $sql = SQL_ADD_POLICE_SIGNATURE;
            break;
        case 'signature_collector':
            $sql = SQL_ADD_COLLECTOR_SIGNATURE;
            $name = ju.requires('name', $req.body);
            break;
        case 'signature_causer':
            $sql = SQL_ADD_CAUSER_SIGNATURE;
            break;
        case 'insurance_document':
            $sql = SQL_ADD_INSURANCE_DOCUMENT;
            $file_name = ju.requires('file_name', $req.body);
            break;
        case 'vehicle_damage':
            $sql = SQL_ADD_VEHICLE_DAMAGE_DOCUMENT;
            $file_name = ju.requires('file_name', $req.body);
            break;
        case 'any':
            $sql = SQL_ADD_ANY_DOCUMENT;
            $file_name = ju.requires('file_name', $req.body);
            break;
        default:
            throw new common.InvalidRequest();
    }

    var $content_type = ju.requires('content_type', $req.body);
    var $file_size = ju.requiresInt('file_size', $req.body);
    var $content = ju.requires('content', $req.body);


    var $params = [$voucher_id, $content_type, $file_size, $content, $token];

    if ($file_name && $file_name != "" && ($category == 'insurance_document' || $category == 'any' || $category == 'vehicle_damage')) {
        $params = [$voucher_id, $file_name, $content_type, $file_size, $content, $token];
    }

    if ($category == 'signature_collector') {
        $params = [$voucher_id /*, $file_name*/, $content_type, $file_size, $content, $name, $token];
    }

    //insert object
    db.one($sql, $params, function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/voucher/attachment/:voucher_id/:token', function ($req, $res) {
    var $voucher_id = ju.requiresInt('voucher_id', $req.params);
    var $token = ju.requires('token', $req.params);

    db.many(SQL_FETCH_ALL_VOUCHER_ATTACHMENTS, [$voucher_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.delete('/voucher/attachment/:voucher_id/:doc_id/:token', function ($req, $res) {
    var $voucher_id = ju.requiresInt('voucher_id', $req.params);
    var $document_id = ju.requiresInt('doc_id', $req.params);
    var $token = ju.requires('token', $req.params);

    db.one(SQL_REMOVE_TOWING_VOUCHER_ATTACHMENT, [$voucher_id, $document_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.get('/voucher/validation_messages/:voucher_id/:token', function ($req, $res) {
    var $voucher_id = ju.requiresInt('voucher_id', $req.params);
    var $token = ju.requires('token', $req.params);

    db.many(SQL_FETCH_ALL_VOUCHER_VALIDATION_MESSAGES, [$voucher_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

// -----------------------------------------------------------------------------
// REMOVE AN ACTIVITY FROM A VOUCHER
//  * voucher_id (required), the voucher id
//  * activity_id (required), the id of the activity to remove
//  * token (required), the token of the current session
// -----------------------------------------------------------------------------
router.delete('/voucher/:voucher_id/activity/:activity_id/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $activity_id = ju.requiresInt('activity_id', $req.params);
    var $voucher_id = ju.requiresInt('voucher_id', $req.params);

    db.one(SQL_REMOVE_TOWING_VOUCHER_ACTIVITY, [$voucher_id, $activity_id, $token], function ($error, $result, $fields) {
        //fetch the towing activities information
        db.many(SQL_FETCH_ALL_VOUCHER_ACTIVITIES, [null, $voucher_id, $token], function ($error, $result, $fields) {
            ju.send($req, $res, $result);
        });
    });
});


// -----------------------------------------------------------------------------
// REMOVE AN ADDITIONAL COST FROM A VOUCHER
//  * voucher_id (required), the voucher id
//  * cost_id (required), the id of the activity to remove
//  * token (required), the token of the current session
// -----------------------------------------------------------------------------
router.delete('/voucher/:voucher_id/additional_cost/:cost_id/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $cost_id = ju.requiresInt('cost_id', $req.params);
    var $voucher_id = ju.requiresInt('voucher_id', $req.params);

    db.one(SQL_REMOVE_TOWING_VOUCHER_ADDITIONAL_COST, [$voucher_id, $cost_id, $token], function ($error, $result, $fields) {
        //fetch the towing additional costs information
        db.many(SQL_FETCH_ALL_TOWING_VOUCHER_ADDITIONAL_COSTS, [$voucher_id, $token], function ($error, $result, $fields) {
            ju.send($req, $res, $result);
        });
    });
});


router.get('/depot/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    db.one(SQL_FETCH_TOWING_DEPOT, [$voucher_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.put('/depot_agency/:depot_id/:voucher/:token', function ($req, $res) {
    var $depot_id = ju.requiresInt('depot_id', $req.params);
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    //upate the voucher's depot if it is available

    var $params = [$depot_id, $voucher_id, $token];

    db.one(SQL_UPDATE_TOWING_DEPOT_TO_AGENCY, $params, function ($error, $result, $fields) {
        if ($result.id) {
            db.one(SQL_FETCH_TOWING_DEPOT, [$voucher_id, $token], function ($error, $result, $fields) {
                ju.send($req, $res, $result);
            });
        } else {
            ju.send($req, $res, $result);
        }
    });
});

router.put('/depot/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    var $depot = ju.requires('depot', $req.body);

    //upate the voucher's depot if it is available
    if ($depot.id) {
        var $_depot = $depot;

        var $params = [$_depot.id, $voucher_id, $_depot.name, $_depot.street, $_depot.street_number,
            $_depot.street_pobox, $_depot.zip, $_depot.city, $_depot.default_depot, $token];

        db.one(SQL_UPDATE_TOWING_DEPOT, $params, function ($error, $result, $fields) {
            if ($result && 'id' in $result) {
                ju.send($req, $res, $depot);
            } else {
                ju.send($req, $res, $result);
            }
        });
    }
});

router.get('/causer/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    db.one(SQL_FETCH_CAUSER, [$voucher_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

router.put('/causer/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    var $_causer = ju.requires('causer', $req.body);

    if ($_causer && $_causer.id) {
        var $_customer = $_causer;

        if ($_customer.company_vat) {
            vies.checkVat($_customer.company_vat, function ($result, $error) {
                if ($error) {
                    ju.send($req, $res, {"result": "invalid_vat", "vat": $_customer.company_vat});
                    // ju.send($req, $res, $error);
                }
                else {
                    updateCauser($_customer, $voucher_id, $token, $req, $res);
                }
            });
        }
        else {
            updateCauser($_customer, $voucher_id, $token, $req, $res);
        }
    }
});

function updateCauser($_customer, $voucher_id, $token, $req, $res) {
    var $params = [$_customer.id, $voucher_id,
        $_customer.first_name, $_customer.last_name, $_customer.company_name, $_customer.company_vat,
        $_customer.street, $_customer.street_number, $_customer.street_pobox,
        $_customer.zip, $_customer.city, $_customer.country,
        $_customer.phone, $_customer.email,
        $token];

    db.one(SQL_UPDATE_TOWING_CAUSER, $params, function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
}

router.get('/customer/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    db.one(SQL_FETCH_CUSTOMER, [$voucher_id, $token], function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    })
});

router.put('/customer/agency/:voucher/:token', function ($req, $res) {
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    db.one(SQL_UPDATE_TOWING_CUSTOMER_TO_AGENCY, [$voucher_id, $token], function ($error, $result, $fields) {
        if ($result.id) {
            db.one(SQL_FETCH_CUSTOMER, [$voucher_id, $token], function ($error, $result, $fields) {
                ju.send($req, $res, $result);
            });
        } else {
            ju.send($req, $res, $result);
        }
    });
});

router.put('/customer/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $token = ju.requires('token', $req.params);

    var $_customer = ju.requires('customer', $req.body);

    if ($_customer && $_customer.id) {
        if ($_customer.company_vat) {
            vies.checkVat($_customer.company_vat, function ($result, $error) {
                if ($error) {
                    ju.send($req, $res, {"result": "invalid_vat", "vat": $_customer.company_vat});
                    //ju.send($req, $res, $error);
                }
                else {
                    updateCustomer($_customer, $voucher_id, $token, $req, $res);
                }
            });
        }
        else {
            updateCustomer($_customer, $voucher_id, $token, $req, $res);
        }
    }
});

function updateCustomer($_customer, $voucher_id, $token, $req, $res) {
    var $params = [$_customer.id, $voucher_id,
        $_customer.type,
        $_customer.first_name, $_customer.last_name, $_customer.company_name, $_customer.company_vat,
        $_customer.street, $_customer.street_number, $_customer.street_pobox,
        $_customer.zip, $_customer.city, $_customer.country,
        $_customer.phone, $_customer.email,
        $_customer.invoice_ref,
        $token];

    // LOG.d(TAG, "Update customer parameters:" + JSON.stringify($params));

    db.one(SQL_UPDATE_TOWING_CUSTOMER, $params, function ($error, $result, $fields) {
        if ($result && 'id' in $result) {
            ju.send($req, $res, $_customer);
        } else {
            ju.send($req, $res, $result);
        }
    });
}

router.put('/voucher/activities/:dossier/:voucher/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher_id = ju.requiresInt('voucher', $req.params);

    var $token = ju.requires('token', $req.params);

    var $activities = ju.requires('activities', $req.body);


    if ($activities && $activities.length > 0) {
        var $i = 0;
        $activities.forEach(function ($activity) {
            db.one(SQL_UPDATE_TOWING_VOUCHER_ACTIVITY, [$voucher_id, $activity.activity_id, $activity.amount, $token], function ($error, $result, $fields) {
                $i++;

                if ($i >= $activities.length) {
                    //fetch the towing activities information
                    db.many(SQL_FETCH_ALL_VOUCHER_ACTIVITIES, [$dossier_id, $voucher_id, $token], function ($error, $result, $fields) {
                        ju.send($req, $res, $result);
                    });
                }
            });
        });
    }
    else {
        $res.end('');
    }
});

// --
router.put('/collector/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $voucher_number = ju.requiresInt('voucher_number', $req.body);
    var $collector_id = ju.requiresInt('collector_id', $req.body);
    var $vehicule_collected = ju.requiresInt('vehicule_collected', $req.body);

    var $params = [$voucher_number, $collector_id, $vehicule_collected, $token];

    db.one(SQL_UPDATE_VOUCHER_COLLECTION_INFO, $params, function ($error, $result, $fields) {
        ju.send($req, $res, $result);
    });
});

// -- UPDATE DOSSIER RELATED INFORMATION
router.put('/:dossier/:token', function ($req, $res) {
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $token = ju.requires('token', $req.params);

    var $dossier = ju.requires('dossier', $req.body);

    //dossier fields
    var $call_number = ju.requires('call_number', $dossier);
    var $company_id = ju.requiresInt('company_id', $dossier);
    var $incident_type_id = ju.requiresInt('incident_type_id', $dossier);
    var $allotment_id = ju.requiresInt('allotment_id', $dossier);
    var $direction_id = ju.requiresInt(['direction_id', 'allotment_direction_id'], $dossier);
    var $indicator_id = ju.requiresInt(['indicator_id', 'allotment_direction_indicator_id'], $dossier);
    var $traffic_lanes = $dossier.traffic_lanes;
    var $traffic_post_id = $dossier.police_traffic_post_id;

    var $vouchers = ju.requires('towing_vouchers', $dossier);


    var $params = [$dossier_id, $call_number, $company_id, $incident_type_id, $allotment_id, $direction_id, $indicator_id, $traffic_post_id, $token];

    db.one(SQL_UPDATE_DOSSIER, $params, function ($error, $result, $fields) {
        if ($result && 'error' in $result) {
            ju.send($req, $res, $result);
        } else {
            db.one(SQL_PURGE_DOSSIER_TRAFFIC_LANES, [$dossier_id, $token], function ($error, $result, fields) {
                if ($traffic_lanes) {
                    $traffic_lanes.forEach(function ($traffic_lane) {
                        var $traffic_lane_id = null;
                        if (_.isObject($traffic_lane)) {
                            if ($traffic_lane.selected)
                                $traffic_lane_id = $traffic_lane.id;
                        } else {
                            $traffic_lane_id = $traffic_lane;
                        }

                        if ($traffic_lane_id) {
                            db.one(SQL_CREATE_DOSSIER_TRAFFIC_LANES, [$dossier_id, $traffic_lane_id, $token], function ($error, $result, $fields) {
                                //fire and forget
                            });
                        }
                    });
                }
            });

            var $i = 0;

            if (!$vouchers || $vouchers.length == 0) {
                fetchDossierById($req, $res, $result.id, $token);
            } else {
                $vouchers.forEach(function ($voucher) {
                    var $voucher_id = $voucher.id;
                    var $insurance_id = _.isNaN(parseFloat($voucher.insurance_id)) ? null : $voucher.insurance_id;
                    var $insurance_dossier_nr = $voucher.insurance_dossiernr;
                    var $insurance_invoice_number = $voucher.insurance_invoice_number;
                    var $warranty_holder = $voucher.insurance_warranty_held_by;
                    var $collector_id = _.isNaN(parseFloat($voucher.collector_id)) ? null : $voucher.collector_id;
                    var $police_signature_date = _.isNaN(parseFloat($voucher.police_signature_dt)) ? null : parseFloat($voucher.police_signature_dt);
                    var $police_name = $voucher.police_name;
                    var $recipient_signature_date = _.isNaN(parseFloat($voucher.recipient_signature_dt)) ? null : parseFloat($voucher.recipient_signature_dt);
                    var $vehicule = $voucher.vehicule;
                    var $vehicule_type = $voucher.vehicule_type;
                    var $vehicule_licence_plate = $voucher.vehicule_licenceplate;
                    var $vehicule_color = $voucher.vehicule_color;
                    var $vehicule_keys_present = $voucher.vehicule_keys_present;
                    var $vehicule_country = $voucher.vehicule_country;
                    var $vehicule_collected = _.isNaN(parseFloat($voucher.vehicule_collected)) ? null : parseFloat($voucher.vehicule_collected);
                    var $vehicule_impact_remarks = $voucher.vehicule_impact_remarks;
                    var $towing_id = $voucher.towing_id; //towing_id is a VARCHAR field
                    var $towed_by = $voucher.towed_by;
                    var $towing_vehicle_id = _.isNaN(parseFloat($voucher.towing_vehicle_id)) ? null : parseFloat($voucher.towing_vehicle_id);
                    var $towed_by_vehicule = $voucher.towed_by_vehicle;
                    var $towing_called = _.isNaN(parseFloat($voucher.towing_called)) ? null : parseFloat($voucher.towing_called);
                    var $towing_arrival = _.isNaN(parseFloat($voucher.towing_arrival)) ? null : parseFloat($voucher.towing_arrival);
                    var $towing_start = _.isNaN(parseFloat($voucher.towing_start)) ? null : parseFloat($voucher.towing_start);
                    var $towing_completed = _.isNaN(parseFloat($voucher.towing_completed)) ? null : parseFloat($voucher.towing_completed);
                    var $signa_id = $voucher.signa_id; //signa_id is a VARCHAR field
                    var $signa_by = $voucher.signa_by;
                    var $signa_by_vehicule = $voucher.signa_by_vehicle;
                    var $signa_arrival = _.isNaN(parseFloat($voucher.signa_arrival)) ? null : parseFloat($voucher.signa_arrival);
                    var $cic = _.isNaN(parseFloat($voucher.cic)) ? null : parseFloat($voucher.cic);
                    var $causer_not_present = _.isNaN(parseFloat($voucher.causer_not_present)) ? null : parseFloat($voucher.causer_not_present);
                    var $police_not_present = _.isNaN(parseFloat($voucher.police_not_present)) ? null : parseFloat($voucher.police_not_present);
                    var $additional_info = $voucher.additional_info;

                    var $actions = $voucher.actions;
                    var $categoryPrefixes = ['signa_arrival', 'towing_arrival', 'towing_start', 'towing_completed'];
                    var $towingTrackedLocations = [];

                    LOG.d(TAG, "Current voucher: " + $voucher_id);

                    for (var $ii = 0; $ii < $categoryPrefixes.length; $ii++) {
                        LOG.d(TAG, "Checking lat/long for category: " + $categoryPrefixes[$ii]);

                        if ($voucher[$categoryPrefixes[$ii]]) {
                            var $_reg_date = (_.isNaN(parseFloat($voucher[$categoryPrefixes[$ii]])) ? null : parseFloat($voucher[$categoryPrefixes[$ii]]));

                            var $latLong = {
                                'category': $categoryPrefixes[$ii],
                                'registration_date' : $_reg_date,
                                'lat': $voucher[$categoryPrefixes[$ii] + '_lat'],
                                'long': $voucher[$categoryPrefixes[$ii] + '_long']
                            }

                            $towingTrackedLocations.push($latLong);
                        }
                    }

                    LOG.d(TAG, "Towing tracked locations contains: " + JSON.stringify($towingTrackedLocations));


                    // -------------------------------------------------------------------
                    // UPDATE TRACKED LOCATIONS
                    // -------------------------------------------------------------------
                    if($towingTrackedLocations.length > 0) {
                        $towingTrackedLocations.forEach(function($location) {
                           var $_locParam = [$voucher_id,
                                                $location.category,
                                                $location.registration_date,
                                                $location.lat, $location.long,
                                                $token];

                            db.one(SQL_CREATE_TOWING_LOCATION_TRACKING, $_locParam, function($error, $result, $fields) {
                               //fire and forget
                            });
                        });
                    }


                    // -------------------------------------------------------------------
                    // UPDATE VOUCHER DEPOT
                    // -------------------------------------------------------------------
                    //upate the voucher's depot if it is available
                    if ($voucher.depot && $voucher.depot.id) {
                        var $_depot = $voucher.depot;

                        var $params2 = [$_depot.id, $voucher_id, $_depot.name, $_depot.street, $_depot.street_number,
                            $_depot.street_pobox, $_depot.zip, $_depot.city, $_depot.default_depot, $token];

                        db.one(SQL_UPDATE_TOWING_DEPOT, $params2, function ($error, $result, $fields) {
                            //fire and forget!
                        });
                    }

                    // -------------------------------------------------------------------
                    // UPDATE CAUSER
                    // -------------------------------------------------------------------

                    //TODO: insert VAT check
                    if ($voucher.causer && $voucher.causer.id) {
                        var $_customer = $voucher.causer;

                        var $params2 = [$_customer.id, $voucher_id,
                            $_customer.first_name, $_customer.last_name, $_customer.company_name, $_customer.company_vat,
                            $_customer.street, $_customer.street_number, $_customer.street_pobox,
                            $_customer.zip, $_customer.city, $_customer.country,
                            $_customer.phone, $_customer.email,
                            $token];

                        db.one(SQL_UPDATE_TOWING_CAUSER, $params2, function ($error, $result, $fields) {
                            //fire and forget!
                        });
                    }

                    // -------------------------------------------------------------------
                    // UPDATE CUSTOMER
                    // -------------------------------------------------------------------
                    //TODO: insert VAT check!
                    if ($voucher.customer && $voucher.customer.id) {
                        var $_customer = $voucher.customer;

                        var $params2 = [$_customer.id, $voucher_id,
                            $_customer.type,
                            $_customer.first_name, $_customer.last_name, $_customer.company_name, $_customer.company_vat,
                            $_customer.street, $_customer.street_number, $_customer.street_pobox,
                            $_customer.zip, $_customer.city, $_customer.country,
                            $_customer.phone, $_customer.email,
                            $_customer.invoice_ref,
                            $token];

                        db.one(SQL_UPDATE_TOWING_CUSTOMER, $params2, function ($error, $result, $fields) {
                            //fire and forget!
                        });
                    }

                    // -------------------------------------------------------------------
                    // UPDATE ADDITIONAL COSTS
                    // -------------------------------------------------------------------
                    if ($voucher.towing_additional_costs) {
                        $voucher.towing_additional_costs.forEach(function ($cost) {
                            var params2 = [$cost.id, $voucher_id, $cost.name, $cost.fee_excl_vat, $cost.fee_incl_vat, $token];

                            console.log("----- Adding additional costs");
                            console.log(params2);

                            db.one(SQL_UPDATE_TOWING_VOUCHER_ADDITIONAL_COST, params2, function ($error, $result, $fields) {
                                //fire and forget
                            });
                        });
                    }

                    // -------------------------------------------------------------------
                    // UPDATE TOWING ACTIVITIES
                    // -------------------------------------------------------------------
                    if ($voucher.towing_activities) {
                        $voucher.towing_activities.forEach(function ($activity) {
                            db.one(SQL_UPDATE_TOWING_VOUCHER_ACTIVITY, [$voucher_id, $activity.activity_id, $activity.amount, $token], function ($error, $result, $fields) {
                                //fire and forget
                            });
                        });
                    }

                    // -------------------------------------------------------------------
                    // UPDATE TOWING PAYMENTS
                    // -------------------------------------------------------------------
                    if ($voucher.towing_payments) {
                        var $vtp = $voucher.towing_payments;

                        db.one(SQL_UPDATE_TOWING_VOUCHER_PAYMENTS, [$dossier_id, $voucher_id, $vtp.amount_guaranteed_by_insurance,
                            $vtp.paid_in_cash, $vtp.paid_by_bank_deposit, $vtp.paid_by_debit_card,
                            $vtp.paid_by_credit_card, $token], function ($error, $result, $fields) {
                            //fire and forget
                        });
                    }


                    // -------------------------------------------------------------------
                    // UPDATE PAYMENT DETAILS
                    // -------------------------------------------------------------------
                    if ($voucher.towing_payment_details) {
                        $voucher.towing_payment_details.forEach(function ($detail) {
                            var $params = [
                                $detail.id,
                                $detail.towing_voucher_payment_id,
                                $detail.foreign_vat,
                                $detail.amount_excl_vat,
                                $detail.amount_incl_vat,
                                $detail.amount_paid_cash,
                                $detail.amount_paid_bankdeposit,
                                $detail.amount_paid_maestro,
                                $detail.amount_paid_visa,
                                $token
                            ];

                            db.one(SQL_UPDATE_TOWING_VOUCHER_PAYMENT_DETAILS, $params, function ($error, $result, $fields) {
                                //fire and forget
                            })
                        });
                    }


                    // -------------------------------------------------------------------
                    // UPDATE TOWING VOUCHER
                    // -------------------------------------------------------------------
                    $cic = $cic == '' ? null : $cic;

                    var $params3 = [$dossier_id, $voucher_id, $insurance_id, $insurance_dossier_nr, $insurance_invoice_number,
                        $warranty_holder, $collector_id,
                        $vehicule, $vehicule_type, $vehicule_color, $vehicule_keys_present, $vehicule_licence_plate, $vehicule_country,
                        $vehicule_impact_remarks,
                        $signa_id, $signa_by, $signa_by_vehicule, $signa_arrival,
                        $towing_id, $towed_by, $towing_vehicle_id, $towed_by_vehicule,
                        $towing_called, $towing_arrival, $towing_start,
                        $towing_completed, $police_name, $police_signature_date, $recipient_signature_date,
                        $vehicule_collected, $causer_not_present, $police_not_present, $cic, $additional_info, $token];

                    db.one(SQL_UPDATE_TOWING_VOUCHER, $params3, function ($error, $result, $fields) {
                        if (++$i == $vouchers.length) {
                            fetchDossierById($req, $res, $dossier_id, $token);
                        }
                    });

                    if ($actions && $signa_id != null) {
                        if ($actions.signa_send_notification && $actions.signa_send_notification == 1) {
                            LOG.d(TAG, " =============================================== ");
                            LOG.d(TAG, "  > Sending a notification - NEW_TOWING_VOUCHER_ASSIGNED")
                            LOG.d(TAG, " =============================================== ");

                            db.one(SQL_FETCH_USER_BY_ID, [$signa_id, $token], function ($error, $result, $fields) {
                                if ($result && $result.mobile_device_id && $result.mobile_device_id != '') {
                                    agent.createMessage()
                                        .device($result.mobile_device_id)
                                        .alert('Nieuwe takelbon beschikbaar!')
                                        .set('ACTION', 'NEW_TOWING_VOUCHER_ASSIGNED')
                                        .send();
                                }
                            });

                        }

                        if (!$actions.signa_send_notification && $actions.towing_updated_notification && $actions.towing_updated_notification == 1) {
                            LOG.d(TAG, " =============================================== ");
                            LOG.d(TAG, "  > Sending a notification - TOWING_UPDATED_FOR_VOUCHER")
                            LOG.d(TAG, " =============================================== ");

                            db.one(SQL_FETCH_USER_BY_ID, [$signa_id, $token], function ($error, $result, $fields) {
                                if ($result && $result.mobile_device_id && $result.mobile_device_id != '') {

                                    agent.createMessage()
                                        .device($result.mobile_device_id)
                                        .alert('Takelbon werd aangepast!')
                                        .set('ACTION', 'TOWING_UPDATED_FOR_VOUCHER')
                                        .set('towing_id', $towing_id)
                                        .set('towing_vehicle_id', $towing_vehicle_id)
                                        .set('towing_called', $towing_called)
                                        .set('voucher_id', $voucher_id)
                                        .send();
                                }
                            });

                        }
                    }


                });
            }
        }
    });
});

// -----------------------------------------------------------------------------
// DOSSIER COMMUNICATIONS
// -----------------------------------------------------------------------------

router.get('/communication/:type/:dossier/:voucher/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $type = ju.requires('type', $req.params);
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $voucher_id = ju.intValueOf('voucher', $req.params);


    var $params = [$dossier_id, $voucher_id, $token];

    switch ($type) {
        case 'email':
            db.many(SQL_FETCH_ALL_EMAIL_COMMUNICATION, $params, function ($error, $result, $fields) {
                if ($result.length > 0 && !('error' in $result)) {
                    var $comms = [];

                    $result.forEach(function ($item) {
                        db.many(SQL_FETCH_ALL_EMAIL_RECIPIENTS, [$item.id, $token], function ($error, $r_result, $fields) {
                            $item.recipients = $r_result;

                            $comms.push($item);

                            if ($comms.length >= $result.length) {
                                ju.send($req, $res, $comms);
                            }
                        });
                    });
                } else {
                    ju.send($req, $res, $result);
                }
            });

            break;
        case 'internal':
            db.many(SQL_FETCH_ALL_INTERNAL_COMMUNICATION, $params, function ($error, $result, $fields) {
                ju.send($req, $res, $result);
            });

            break;
        default:
            throw new common.InvalidRequest();
    }
});

router.post('/communication/:type/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);
    var $type = ju.requires('type', $req.params);

    var $dossier_id = ju.requiresInt('dossier_id', $req.body);
    var $voucher_id = ju.intValueOf('voucher_id', $req.body);

    switch ($type) {
        case 'email':
            var $message = ju.requires('message', $req.body);
            var $subject = ju.requires('subject', $req.body);
            var $recipients = ju.requires('recipients', $req.body);

            var $params = [$dossier_id, $voucher_id, 'EMAIL', $subject, $message, $token];

            db.one(SQL_ADD_DOSSIER_COMMUNICATION, $params, function ($error, $result, $fields) {
                if ($result && $result.status == 'OK') {
                    $recipients.forEach(function ($recipient) {
                        db.one(SQL_ADD_DOSSIER_COMM_RECIPIENT, [$result.communication_id, $recipient.type, $recipient.email, $token], function ($error, $result, $fields) {
                            //fire and forget
                        });
                    });
                }

                // create reusable transporter object using SMTP transport
                var transporter = nodemailer.createTransport(settings.smtp.transport);

                // setup e-mail data with unicode symbols
                var mailOptions = {
                    from: settings.smtp.from, // sender address
                    to: $recipients, // list of receivers
                    subject: 'Towing.be - ' + $subject, // Subject line
                    html: _.escape($message)
                };

                // send mail with defined transport object
                transporter.sendMail(mailOptions, function (error, info) {
                    if (error) {
                        LOG.e(TAG, error);
                    } else {
                        LOG.d(TAG, "E-mail verzonden naar: " + JSON.stringify($recipients));
                    }
                });


                ju.send($req, $res, $result);
            });

            break;
        case 'internal':
            var $message = ju.requires('message', $req.body);
            var $params = [$dossier_id, $voucher_id, 'INTERNAL', null, $message, $token];

            db.one(SQL_ADD_DOSSIER_COMMUNICATION, $params, function ($error, $result, $fields) {
                ju.send($req, $res, $result);
            });

            break;
        case 'awv_voucher_email':
            company.findCurrentCompany($token, function ($_company) {
                //CREATE A TOWING VOUCHER PDF AND SEND IT TO AWV
                dossier.createTowingVoucherReport($dossier_id, $voucher_id, 'towing', $token, $res, $res, function ($towing_voucher_filename, $towing_voucher_base64, $dossier, $voucher) {
                    // setup e-mail data with unicode symbols
                    var mailOptions = {
                        from: $_company.email, // sender address
                        to: settings.awv.receivers, // list of receivers
                        subject: 'Towing.be - ' + $_company.code + ' - Takelbon ' + $voucher.voucher_number, // Subject line
                        html: 'Beste, <br /><br />'
                        + 'In bijlage sturen wij graag de informatie met betrekking tot volgende F.A.S.T. takeling:'
                        + '<ul>'
                        + '<li><strong>F.A.S.T. takeldienst: </strong>' + $_company.name + ' (' + $_company.code + ')'
                        + '<li><strong>Takelbon: </strong>' + $voucher.voucher_number + '</li>'
                        + '<li><strong>Datum oproep: </strong>' + dateutil.convertUnixTStoDateTimeFormat($dossier.call_date_ts) + '</li>'
                        + '<li><strong>Oproepnummer: </strong>' + $dossier.call_number + '</li>'
                        + '</ul>'
                        + 'Bij verdere vragen kan u steeds contact opnemen met: ' + $_company.email
                        + '<br /><br/><br />Vriendelijke groet,<br>- ' + $_company.name + ' (Administratie)'
                        + '<br /><br /><br />'
                        + '<strong>Bijlagen:</strong><br /><ol>'
                        + '<li>Takelbon: ' + $towing_voucher_filename + '</li>'
                        + '</ol><br/><br/><br/>',
                        attachments: [
                            {   // base64 buffer as an attachment
                                filename: $towing_voucher_filename,
                                content: $towing_voucher_base64,
                                encoding: "base64"
                            }
                        ]
                    };

                    // create reusable transporter object using SMTP transport
                    var transporter = nodemailer.createTransport(settings.smtp.transport);

                    // send mail with defined transport object
                    transporter.sendMail(mailOptions, function (error, info) {
                        if (error) {
                            LOG.e(TAG, error);
                        } else {
                            LOG.d(TAG, "E-mail verzonden naar: " + settings.awv.receivers);
                        }
                    });
                });
            });

            ju.send($req, $res, {'result': 'ok'});
            break;
        default:
            throw new common.InvalidRequest();
    }
});

router.post('/signature/:type/:dossier/:voucher/:token', function ($req, $res) {
    var $voucher_id = ju.requiresInt('voucher', $req.params);
    var $dossier_id = ju.requiresInt('dossier', $req.params);
    var $token = ju.requires('token', $req.params);
    var $type = ju.requiresEnum('type', $req.params, ['collector', 'causer', 'police']);

    var $message = "";

    switch ($type) {
        case 'collector':
            $message = 'Aanvraag voor handtekening ophaler';
            break;
        case 'causer':
            $message = 'Aanvraag voor handtekening hinderverwerkker';
            break;
        case 'police':
            $message = 'Aanvraag voor handtekening politie';
            break;
    }

    company.findCurrentCompany($token, function ($result) {
        LOG.d(TAG, "Sending signature request <" + $type + "> to <" + JSON.stringify($result) + ">");
        LOG.d(TAG, "Sending to: " + $result.mobile_device_id);

        agent.createMessage()
            .device($result.mobile_device_id)
            .alert($message)
            .set('ACTION', 'COLLECTOR_SIGNATURE')
            .set('voucher_id', $voucher_id)
            .set('dossier_id', $dossier_id)
            .set('type', $type)
            .send();
    });

    ju.send($req, $res, {'result': 'ok'});
});

router.post('/export/vouchersAwaitingApproval/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    var xlsx = require('node-xlsx');
    var data = [];

    db.many(SQL_FETCH_VOUCHER_AWAITING_APPROVAL_FOR_EXPORT, [$token], function ($error, $result, $fields) {
        if (data.length == 0) {
            var $headers = [];

            for (var $i = 0; $i < $fields[0].length; $i++) {
                var $field = $fields[0][$i];

                if ($field)
                    $headers.push($field.name);
            }

            data.push($headers);
        }

        for (var $j = 0; $j < $result.length; $j++) {
            var $row = [];

            var $r = $result[$j];

            for (var $i = 0; $i < $fields[0].length; $i++) {
                var $field = $fields[0][$i];

                if ($field)
                    $row.push($r[$field.name]);
            }

            data.push($row);
        }

        var buffer = xlsx.build([{name: "Takelbonnen", data: data}]); // returns a buffer

        ju.send($req, $res, {
            'base64': buffer.toString('base64')
        });
    });
});

router.post('/render/awv_letter/:token', function ($req, $res) {
    var $token = ju.requires('token', $req.params);

    db.many(SQL_FETCH_VOUCHER_APPROVED_BY_AWV, [$token], function ($error, $result, $fields) {
        $result.forEach(function ($invoice) {
            processSingleLetter($invoice, true, $token);
        });

        processLettersInBatch($result, false, $token);
    });

    ju.send($req, $res, {
        'result': 'ok'
    });
});

function processSingleLetter($result, $persist, $token) {
    processLettersInBatch([$result], $persist, $token);
}


function processLettersInBatch($invoices, $persist, $token) {
    var $filename = './templates/awv/towing_letter.html';

    fs.readFile($filename, 'utf8', function ($err, $data) {
        if ($err) {
            LOG.d(TAG, JSON.stringify($err));
            throw $err;
        }

        //compile the template
        var folder = settings.fs.tmp;

        var $today = new Date().getTime();

        phantom.create(function (error, ph) {
            //create a new invoice pdf
            var $template = _.template($data);

            var $compiled_template = $template({
                'invoices': $invoices,
                'render_date': dateFormat($today, "dd/mm/yyyy")
            });

            var filename = 'letter_fast_towing_' + uuid.v4() + '.pdf';

            ph.createPage(function (error, page) {
                page.settings = PAGESETTINGS.general;
                page.set('viewportSize', PAGESETTINGS.viewport);
                page.set('paperSize', PAGESETTINGS.paper);
                page.set('content', $compiled_template, function (error) {
                    if (error) {
                        LOG.e(TAG, 'Error setting content: ' + error);
                    }
                });

                page.onLoadFinished = function (status) {
                    page.render(folder + filename, {format: 'pdf', quality: '10'}, function (error) {
                        if (error) {
                            LOG.e(TAG, 'Error rendering PDF: ' + error);
                        }
                        else {
                            fs.readFile(folder + filename, "base64", function (a_error, data) {
                                if ($persist) //letter for one customer
                                {
                                    $invoice = $invoices[0];

                                    db.one(SQL_ADD_ATTACHMENT_TO_VOUCHER, [$invoice.towing_voucher_id, 'Brief FAST Takeling ' + dateFormat($today, "dd/mm/yyyy") + '.pdf',
                                        "application/pdf", data.length, data, $token], function ($error, $att, $fields) {
                                        //mark voucher as closed
                                        db.one(SQL_MARK_VOUCHER_AS_CLOSED, [$invoice.towing_voucher_id, $token], function ($error, $result, $fields) {
                                            //fire and forget
                                        });
                                    });

                                } else { //batch letter
                                    //store pdf in blob table
                                    db.one(SQL_ADD_BLOB, ['Geconsolideerde brieven - FAST Takeling ' + dateFormat($today, "dd/mm/yyyy") + '.pdf',
                                        "application/pdf", data.length, data, $token], function ($error, $att, $fields) {

                                        db.one(SQL_ADD_AWV_LETTER_BATCH, [$att.document_id, $token], function ($error, $result, $fields) {
                                            //fire and forget
                                        });

                                        $invoices.forEach(function ($invoice) {
                                            db.one(SQL_LINK_AWV_LETTER_BATCH_WITH_VOUCHER, [$invoice.towing_voucher_id, $att.document_id, $token], function ($error, $result, $fields) {
                                                //fire and forget
                                            })
                                        });
                                    });
                                }

                                // delete the file
                                fs.unlink(folder + filename, function (err) {
                                    if (err) {
                                        LOG.e(TAG, "Could not delete file: " + JSON.stringify(err));
                                    } else {
                                        LOG.d(TAG, 'successfully deleted ' + filename);
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
    });
}


module.exports = router;
