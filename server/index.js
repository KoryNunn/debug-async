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

var router = new SeaLion();
var fileServer = new Dion(router);

var challengesFolderPath = path.join(__dirname, '../challenges');

var results = {};

setInterval(function(){
    Object.keys(results).forEach(function(challengeName){
        console.log('\n', challengeName);
        Object.keys(results[challengeName]).forEach(function(participantName){
            var participantResults = results[challengeName][participantName];
            console.log('  ', participantName);
            if(!participantResults.attempts.length){
                console.log('    ', 'No attempts yet');
                return;
            }
            var nOver = participantResults.attempts.length - 3;
            if(nOver > 0){
                console.log('    ', nOver, 'attempt' + (nOver === 1 ? '' : 's') + ' not shown ...');
            }
            participantResults.attempts.slice(-5).forEach(function(attempt){
                console.log('    ', 'Elapsed:', ((attempt.time - participantResults.start) / 1000 / 60).toFixed(2), 'minutes - Result:', attempt.result.toUpperCase());
            });
        });
    })
}, 3000);

function getTaskZip(taskName, callback){
    var taskFolderPath = path.join(challengesFolderPath, taskName);
    var maybeTaskPath = righto(fs.stat, taskFolderPath).get(()=>taskFolderPath);
    var validTaskPath = righto.handle(maybeTaskPath, (error, done) => done(new errors.NotFound()));
    var zippedBuffer = righto(zipdir, validTaskPath);

    zippedBuffer(callback);
}

function getChallengesList(callback){
    fs.readdir(challengesFolderPath, callback);
}

function initResult(data, callback){
    var challengeResults = results[data.challenge] = results[data.challenge] || {};
    var participantResults = challengeResults[data.name] = challengeResults[data.name] || {
        start: Date.now(),
        attempts: []
    };
    callback();
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
        get: fileServer.serveFile(path.join(__dirname, '../public/index.html'), 'text/html')
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
    }
});

var server = http.createServer(router.createHandler());

server.listen(8080);