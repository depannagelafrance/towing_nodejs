/*!
 * APN Agent - Scenario Connection Header
 * @see
 */


// uncomment section to enable debug output
// process.env.DEBUG = process.env.DEBUG
//   ? process.env.DEBUG + ',apnagent:*'
//   : 'apnagent:*';



var settings  = require('../settings/settings.js');

/*!
 * Locate your certificate
 */

var join = require('path').join;
  //, pfx = join(__dirname, '../_certs/towingtool-dev.p12');

/*!
 * Create a new gateway agent
 */

var apnagent = require('apnagent')
  , agent = module.exports = new apnagent.Agent();

/*!
 * Configure agent
 */

agent
  .set('cert file', join(__dirname, settings.apns.cert))
  .set('key file', join(__dirname, settings.apns.key))
  .set('passphrase', settings.apns.passphrase)
  .set('expires', '1m')
  .set('reconnect delay', '1s')
  .set('cache ttl', '1m');

if(settings.apns.sandbox)
  agent.enable('sandbox');


// process.stdin.resume();//so the program will not close instantly
//
// function exitHandler(options, err) {
//   agent.close(function() {
//     console.log("Closing the APNS connection");
//   });
//
//   if (options.cleanup) console.log('clean');
//   if (err) console.log(err.stack);
//   if (options.exit) process.exit();
// }
//
// //do something when app is closing
// process.on('exit', exitHandler.bind(null,{cleanup:true}));
//
// //catches ctrl+c event
// process.on('SIGINT', exitHandler.bind(null, {exit:true}));
//
// //catches uncaught exceptions
// process.on('uncaughtException', exitHandler.bind(null, {exit:true}));





/*!
 * Error Mitigation
 */

agent.on('message:error', function (err, msg) {
  switch (err.name) {
    // This error occurs when Apple reports an issue parsing the message.
    case 'GatewayNotificationError':
      console.log('[message:error] GatewayNotificationError: %s', err.message);

      // The err.code is the number that Apple reports.
      // Example: 8 means the token supplied is invalid or not subscribed
      // to notifications for your application.
      if (err.code === 8) {
        console.log('    > %s', msg.device().toString());
        // In production you should flag this token as invalid and not
        // send any futher messages to it until you confirm validity
      }

      break;

    // This happens when apnagent has a problem encoding the message for transfer
    case 'SerializationError':
      console.log('[message:error] SerializationError: %s', err.message);
      break;

    // unlikely, but could occur if trying to send over a dead socket
    default:
      console.log('[message:error] other error: %s', err.message);
      console.log('[message:error] error code: %s', err.code);
      console.log('[message:error] device: %s', msg.device().toString());
      break;
  }
});

/*!
 * Make the connection
 */

agent.connect(function (err) {
  // gracefully handle auth problems
  if (err && err.name === 'GatewayAuthorizationError') {
    console.log('Authentication Error: %s', err.message);
    process.exit(1);
  }

  // handle any other err (not likely)
  else if (err) {
    throw err;
  }

  // it worked!
  var env = agent.enabled('sandbox')
    ? 'sandbox'
    : 'production';

  console.log('apnagent [%s] gateway connected', env);
});
