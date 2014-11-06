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
