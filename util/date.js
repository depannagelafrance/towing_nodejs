var dateFormat  = require('dateformat');

var convertUnixTStoDateTimeFormat = function($unix_ts)
{
  if($unix_ts)
  {
    $_date = new Date($unix_ts * 1000);

    return dateFormat($_date, "dd/mm/yyyy HH:MM");
  }

  return "";
}

exports.convertUnixTStoDateTimeFormat = convertUnixTStoDateTimeFormat;
