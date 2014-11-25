// ================================================
// README
// ================================================
//
// The settings.js has been added to the .gitignore configuration.
// Create a copy from settings.default.js and configure according to your
// environment
//
// Thanks for reading this.

var mysql = {
  user : "root",
  password : "root",
  database : "depannage_lafrance",
  port : 8889,
  connectionLimit: 25,
// debug: true
}

var fs = {
  tmp : "/tmp/"
}

var smtpTransportSettings = {
  service: 'Gmail',
  debug: true,
  auth: {
    user: 'user@gmail.com',
    pass: 'pwd'
  }
}

var apns = {
    default_device: '<edd14b0e f7980538 2e44ed6c 250d57e8 1e00c5b6 e924a013 9d67ef51 c741dbc0>'
}

//
// var smtpTransportSettings = {
//   host: 'smtp.telenet.be',
//   port: '587',
//   debug: true
// }


var smtp = {
  transport: smtpTransportSettings,
  from: 'Towing.be <no-reply@towing.be>'
}


exports.mysql = mysql;
exports.fs = fs;
exports.smtp = smtp;
exports.apns = apns;
