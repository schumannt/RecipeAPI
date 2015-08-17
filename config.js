var config = require('./config.json');

var environment = process.env.RECIPEAPI_ENV;
exports.config = config[environment];
exports.config.environment = environment;
