var config = require('../config.js').config;
var log4js = require('log4js');

log4js.configure({
	"appenders": [{
		"type": "file",
		"filename": config.LogFilePath,
		"maxLogSize": config.maxLogSizeBytes,
		"backups": config.maxRotatedLogs,
		"category": "logs"
	},
    {
        type: "console"
    }]
});

var logger = log4js.getLogger('logs');
logger.setLevel(config.logLevel);
// console.log("Log max file" + log.getLogger('max-file-size'));

module.exports = logger;