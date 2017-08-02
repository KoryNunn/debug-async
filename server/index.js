var righto = require('righto');
var http = require('http');
var SeaLion = require('sea-lion');
var Dion = require('dion');
var fs = require('fs');
var path = require('path');
var zipdir = require('zip-dir');
var errors = require('generic-errors');
var requestData = require('request-data');
var handle = require('./handle');
var port = 8080;

var router = new SeaLion();
var dion = new Dion(router);

var clientFolderPath = path.join(__dirname, '../client');
var challengesFolderPath = path.join(__dirname, '../challenges');

var results = {};

function rightoCacher(cacheTime){
    var result;
    var lastRetrieved;

    return function(newRighto){
        var now = Date.now();

        if(!result || now - lastRetrieved > cacheTime){
            result = newRighto;
            lastRetrieved = now;
        }

        return result;
    };
}

var clientCacher = rightoCacher(10000);
function getClient(callback){
    var zippedClient = clientCacher(righto(zipdir, clientFolderPath));

    zippedClient(callback);
}

var taskCachers = {};
function getTaskZip(taskName, callback){
    var taskFolderPath = path.join(challengesFolderPath, taskName);
    var maybeTaskPath = righto(fs.stat, taskFolderPath).get(()=>taskFolderPath);
    var validTaskPath = righto.handle(maybeTaskPath, (
        error, done) => done(new errors.NotFound()));
    var zippedBuffer = validTaskPath.get(function(taskPath){
            taskCachers[taskName] = taskCachers[taskName] || rightoCacher(3000);
            return taskCachers[taskName](righto(zipdir, taskPath));
        });

    zippedBuffer(callback);
}

function getChallengesList(callback){
    fs.readdir(challengesFolderPath, callback);
}

function initResult(data, callback){
    var challengeResults = results[data.challenge] = results[data.challenge] || {};

    var isFirstInit = !(data.name in challengeResults);
    var participantResults = challengeResults[data.name] = challengeResults[data.name] || {
        start: Date.now(),
        attempts: []
    };
    callback(null, isFirstInit);
}

function storeResult(data, callback){
    var challengeResults = results[data.challenge];
    var participantResults = challengeResults && challengeResults[data.name];
    if(!participantResults){
        return callback(new errors.Unprocessable('No result has been initiated'));
    }

    participantResults.attempts.push({
        time: Date.now(),
        result: data.result
    });

    callback();
}

router.add({
    '/': {
        get: dion.serveFile(path.join(__dirname, '../public/index.html'), 'text/html')
    },
    '/client': {
        get: handle((tokens, callback) => getClient(callback))
    },
    '/challenges': {
        get: handle((tokens, callback) => getChallengesList(callback))
    },
    '/results': {
        get: handle((tokens, callback) => callback(null, results)),
        post: handle(requestData, (tokens, data, callback) => initResult(data, callback)),
        put: handle(requestData, (tokens, data, callback) => storeResult(data, callback))
    },
    '/challenges/`name`.zip': {
        get: handle((tokens, callback) => getTaskZip(tokens.name, callback))
    },
    '/ping': {
        get: handle((tokens, callback) => callback(null, 'totes legit'))
    },
    '/`path...`': {
        get: dion.serveDirectory('./public', {
            '.js': 'application/javascript'
        })
    }
});

var server = http.createServer(router.createHandler());

server.listen(port);
console.log('running on', port)