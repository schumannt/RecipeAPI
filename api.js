'use strict';
var config = require('./config.js').config;
var http = require('http');
var elasticsearch = require('elasticsearch');
var url = require('url');
var log = require('./lib/logger');
var querySearches = require('./querySearches.json'); // Query DSL to construct /k queries
var queryProducts = require('./queryProducts.json'); // Query DSL to construct /p queries
var queryRecipes = require('./queryRecipes.json'); // Query DSL to construct /r queries

log.info("Environment used: " + config.environment);
log.info("Log level: " + log.level.levelStr);

// catch module console.logging
console.log = function () {
    try {
        log.debug(JSON.stringify(arguments));
    } catch (e) {
        log.debug(arguments);
    }
};

http.globalAgent.maxSockets = 1000;

var client = new elasticsearch.Client({
    host: config.elasticSearch,
    log: 'error'
});

/* jshint -W071 */
var server = http.createServer(function httpResponder(request, response) {

    var requestUrl;
    var queryString;
    var queryType;
    var ingredients;
    var allegies;

    log.info(request.url);

    var actions = request.url.split("/");
    var action = actions[actions.length - 1];

    switch (action) {
    case "keepalive.htm":
        log.debug('Keepalive');
        response.writeHead(200, {"Content-Type": "text/html"});
        response.end('Keepalive');
        break;

    case "version":
        var fs = require("fs");
        var branch = fs.readFileSync("../.git/HEAD").toString().replace("ref: refs/heads/", "").replace("\n", "");
        var version = {version: branch};
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.writeHead(200, {"Content-Type": "text/html"});
        response.end(JSON.stringify(version));
        break;

    case "query":
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.writeHead(200, {"Content-Type": "text/html"});
        response.end(JSON.stringify(querySearches, undefined, 2));
        break;

    default:
        try {
            requestUrl = url.parse(request.url, true);
            if(requestUrl.query.q!=undefined){queryString = requestUrl.query.q;}
            if(requestUrl.query.i!=undefined){ingredients = requestUrl.query.i;}
            if(requestUrl.query.a!=undefined){allegies = requestUrl.query.a;}
            queryType = requestUrl.pathname.substr(-1, 1).toLowerCase();
            response.jsonp = requestUrl.query['json.wrf'];
        }
        catch (err) {
            log.warn('Error in parsing URL: ' + request.url);
            response.writeHead(400);
            response.end('This request cannot be processed. The URL is probably incorrectly formed.');
            return;
        }

        processRequest(queryString, queryType, response, requestUrl, ingredients, allegies);

    }
    return;

}).listen(config.port);

server.on('error', function (err) {
    log.error('A server error has occurred. This is likely to have been caused by attempting to start the service when already running!');
    log.error('Message: ' + err.message);
});

log.info('spiffy server started on port ' + config.port);

function processRequest(queryString, queryType, response, requestUrl, ingredients, allegies) {

    var elasticQuery;

    try {
        elasticQuery = getElasticQuery(queryString, queryType, requestUrl, ingredients, allegies);
    }
    catch (err) {
        log.error('Error in transforming to Elastic format. Message: ' + err.message);
        response.writeHead(400);
        response.end('This request cannot be processed.');
        return;
    }

    doElasticRequest(elasticQuery, queryType, response, requestUrl);

    return;
}

function getElasticQuery(queryString, queryType, requestUrl, ingredients, allegies) {

    var elasticQuery={};
    var qt;

    switch (queryType) {

    case 'r':
        qt = queryRecipes;
        // var ingredients = "chicken,basil"
        if(queryString!=undefined){
            qt.body.query.bool.must.push({"term":{"name":queryString}});
        }
        if(ingredients!=undefined){
            ingredients = ingredients.split(",");
            qt.body.query.bool.must.push({"terms":{"ingredients":ingredients}});
        }
        if(allegies!=undefined){
            allegies = allegies.split(",");
            qt.body.query.bool.must_not.push({"terms":{"ingredients":allegies}});
        }
        elasticQuery = qt;
        break;

    case 'p':

        elasticQuery = JSON.parse(JSON.stringify(queryProducts));

        var ids = queryString.replace(new RegExp("id:", "g"), "").replace(new RegExp(" OR ", "g"), ",").split(',');
        elasticQuery.body.query.ids.values = ids;

        if (requestUrl.query.index !== undefined) {
            elasticQuery.index = requestUrl.query.index;
            log.debug("Using " + requestUrl.query.index + " indexer");
        }
	
        break;
    }

    return elasticQuery;
}

/* jshint -W071 */
function doElasticRequest(elasticQuery, queryType, response) {

    client.search(elasticQuery).then(function elasticCallback(body) {

        var logInfo = {
            query:elasticQuery,
            response:body
        };

        log.info(JSON.stringify(logInfo,undefined,2));

        var hits = body.hits.hits;

        if (hits) {
            var results = formatResults(hits);
            var responseContent = response.jsonp + '(' + JSON.stringify(results) + ')';

            response.writeHead(200, {'Content-Type': 'application/json'});
            response.end(responseContent);
        }
        else {
            response.writeHead(404, {'Content-Type': 'application/json'});
            response.end('No results found');
        }

    }, function (error) {
        log.error(error.message);

        response.writeHead(400);
        response.end('The request could not be processed.');
    });

}
function formatResults(hits) {
    var results = [];

	for (var hit in hits) {
		if(hits){
			var source = hits[hit]._source;
			results.push(source);
		}
	}

	return results;
}
