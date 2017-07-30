var righto = require('righto');
var http = require('http');
var SeaLion = require('sea-lion');
var Dion = require('dion');
var fs = require('fs');
var path = require('path');
var zipdir = require('zip-dir');
var errors = require('generic-errors');
var handle = require('./handle');

var router = new SeaLion();
var fileServer = new Dion(router);

var challengesFolderPath = path.join(__dirname, '../challenges');

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

router.add({
    '/': {
        get: fileServer.serveFile(path.join(__dirname, '../public/index.html'), 'text/html')
    },
    '/challenges': {
        get: handle((tokens, callback) => getChallengesList(callback))
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