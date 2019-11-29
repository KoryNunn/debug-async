var righto = require('righto');
var http = require('http');
var SeaLion = require('sea-lion');
var Dion = require('dion');
var fs = require('fs');
var path = require('path');
var zipdir = require('zip-dir');
var errors = require('generic-errors');
var requestData = require('request-data');
var callarest = require('callarest/json');
var handle = require('./handle');
var config = require('./config');
var uuid = require('uuid/v4');
var port = config.port;

var router = new SeaLion();
var dion = new Dion(router);

var clientFolderPath = path.join(__dirname, '../client');
var challengesFolderPath = path.join(__dirname, '../challenges');

var collectionEndpoint = config.collectionEndpoint;

var attemptsReady = require('./attempts');

function saveAttempt(attempt, callback){
    var stored = righto(callarest, {
        method: 'post',
        url: collectionEndpoint('attempts'),
        data: {
            ...attempt,
            token: config.databaseToken
        }
    }, righto.after(attemptsReady()))
    .get(result => result.response.statusCode >= 300 ? righto.fail(result.body) : result.body);

    stored(callback)
}

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
function getClient(referer, callback){
    var zippedClient = clientCacher(righto(zipdir, clientFolderPath, {
        filter: (path, stat) => (!/\.zip$/.test(path) && !/.*challenges\/.*/.test(path) && !/.*session\.json/.test(path))
    }));

    zippedClient(callback);
}

var taskCachers = {};
function getTaskZip(taskName, callback){
    var taskFolderPath = path.join(challengesFolderPath, taskName);
    var maybeTaskPath = righto(fs.stat, taskFolderPath).get(()=>taskFolderPath);
    var validTaskPath = righto.handle(maybeTaskPath, (error, done) => done(new errors.NotFound()));
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
    var sessionId = uuid();

    var saved = righto(saveAttempt, {
        sessionId,
        time: Date.now(),
        result: 'Starting...',
        name: data.name,
        challenge: data.challenge
    });

    var result = saved.get('sessionId');

    result(callback)
}

function storeResult(data, callback){
    saveAttempt({
        time: Date.now(),
        challenge: data.challenge,
        name: data.name,
        sessionId: data.sessionId,
        result: data.result
    }, callback);
}

var cachedAttempts;
function getAttempts(data, callback){
    if(cachedAttempts && Date.now() - cachedAttempts.timestamp < 3000){
        return cachedAttempts(callback)
    }

    var attempts = righto(callarest, {
        method: 'get',
        url: `${collectionEndpoint('attempts')}?limit=10000`,
        data: {
            token: config.databaseToken
        }
    }, righto.after(attemptsReady()))
    .get('body')
    .get('items')

    attempts.timestamp = Date.now();

    attempts(function(){
        cachedAttempts = attempts
    })

    if(!cachedAttempts){
        cachedAttempts = attempts
    }

    cachedAttempts(callback)
}

router.add({
    '/': {
        get: dion.serveFile('./public/index.html', 'text/html')
    },
    '/client': {
        get: handle(function(tokens, callback){
            var response = this.response;
            response.writeHead(200, {'Content-Disposition': 'inline; filename=client.zip'});
            getClient(this.request.headers.referer, callback);
        })
    },
    '/challenges': {
        get: handle((tokens, callback) => getChallengesList(callback))
    },
    '/results': {
        get: handle(requestData, (tokens, data, callback) => getAttempts(data, callback)),
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

server.listen(port, '0.0.0.0');
console.log('running on', port)