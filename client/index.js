var fs = require('fs');
var righto = require('righto');
var createPrompt = require('prompt-sync');
var makeRequest = require('make-json-request');
var request = require('request');
var unzip = require('unzip');

var prompt = createPrompt({
        sigint: true
    });

var challengesDirectory = __dirname + '/challenges';
 
function complete(commands) {
    return function (str) {
        var i;
        var ret = [];
        for (i=0; i< commands.length; i++) {
            if (commands[i].indexOf(str) == 0){
                ret.push(commands[i]);
            }
        }
        return ret;
    };
};

function getServerAddress(callback){
    var serverAddress = prompt('Where\'s the server?: ');
    if(serverAddress.indexOf('http') !== 0){
        serverAddress = 'http://' + serverAddress;
    }

    makeRequest(serverAddress + '/ping', function(error, result){
        if(error || result !== 'totes legit'){
            console.log('Server not found, try again.');
            return getServerAddress(callback);
        }

        callback(null, serverAddress);
    });
}

function getChallengesList(serverAddress, callback){
    console.log('Loading list of challenges...');

    makeRequest(serverAddress + '/challenges', function(error, result){
        if(error){
            if(prompt('Something went wrong, retry? (Y/n)').toLowerCase() !== 'n'){
                return getChallengesList(callback);
            }
            return  callback('Could not load challenge list');
        }

        callback(null, result);
    });
}

function loadChallenge(serverAddress, challengeName, callback){
    var writeStream = fs.createWriteStream(challengesDirectory);

    request(serverAddress + '/challenges/' + challengeName)
        .pipe(unzip.Parse())
        .pipe(writeStream)
        .on('end', function(){
            console.log('Chalenge ready!:', challengesDirectory + '/' + challengeName);
        });
}

function chooseChallenge(serverAddress, challengesList, callback){
    console.log(challengesList);
    var challengeName = righto.sync(prompt, 'Which challenge do you want to do?: ', {
            autocomplete: complete(challengesList)
        });

    challengeName(callback);
}

console.log('Async Challenges.');
var name = righto.sync(prompt, 'What\'s your name?: ');
var serverAddress = righto(getServerAddress, righto.after(name));
var challengesList = righto(getChallengesList, serverAddress);

function challengePrompt(){
    var challengeName = righto(chooseChallenge, serverAddress, challengesList);
    var challengeLoaded = righto(loadChallenge, serverAddress, challengeName);

    challengeLoaded(createPrompt)(console.log);
}

challengePrompt();