var cronJob = require('cron').CronJob;
var Backup = require('./backup');

/*
Seconds: 0-59
Minutes: 0-59
Hours: 0-23
Day of Month: 1-31
Months: 0-11
Day of Week: 0-6*
*/


new cronJob('00 30 11,19 * * 1-5', function(){
    var backup = new Backup();
    backup.execute();
}, null, true, "Europe/Kiev");


var backup = new Backup();
backup.execute();