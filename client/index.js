var fs = require('fs');
var righto = require('righto');
var createPrompt = require('prompt-sync');
var makeRequest = require('make-json-request');
var request = require('request');
var unzip = require('unzip');
var path = require('path');
var spawn = require('child_process').spawn;
var spawnSync = require('child_process').spawnSync;
var exec = require('child_process').exec;

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
    var serverAddress = prompt('Where\'s the server?: ', 'localhost:8080');
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
            if(prompt('Something went wrong, retry? (Y/n): ').toLowerCase() !== 'n'){
                return getChallengesList(callback);
            }
            return  callback('Could not load challenge list');
        }

        callback(null, result);
    });
}

function loadChallenge(serverAddress, challengeName, callback){
    var challengePath = challengesDirectory + '/' + challengeName;
    var relativeChallengePath = './' + path.relative(process.cwd(), challengePath);
    var zipPath = challengePath + '.zip';

    var zipStream = righto.handle(righto(fs.stat, zipPath), function(error, done){
            console.log('Downloading...');
            request(serverAddress + '/challenges/' + challengeName + '.zip')
            .pipe(fs.createWriteStream(zipPath))
            .on('close', function(){
                done(null, fs.createReadStream(zipPath));
            });
        })
        .get(() => fs.createReadStream(zipPath))
        
    var extractedPath = zipStream.get(function(zipStream){

            var extract = righto.handle(righto(fs.stat, challengePath).get(function(){
                    var shouldExtract = prompt('Replace the directory with a fresh copy? (y/N): ', 'n');
                    return shouldExtract.toLowerCase() === 'y';
                }), function(error, done){
                    done(null, true);
                });

            return extract.get(function(shouldExtract){
                if(!shouldExtract){
                    return challengePath;
                }

                console.log('Extracting...');

                return righto(function(done){ 
                    zipStream.pipe(unzip.Extract({ path: challengePath }))
                    .on('close', function(){
                        done(null, challengePath);
                    });  
                });
            });
        });

    var complete = extractedPath.get(function(challengePath){
        console.log('Launch a terminal here:', relativeChallengePath);
        return challengePath;
    });

    complete(callback);
}

function chooseChallenge(serverAddress, challengesList, callback){
    console.log('Available Challenges:');
    console.log(challengesList.map(x => '  ' + x).join('\n'));
    var challengeName = righto.sync(prompt, 'Which challenge do you want to do?: ', {
            autocomplete: complete(challengesList)
        })
        .get(function(name){
            if(!~challengesList.indexOf(name)){
                console.log('Invalid challenge, try again');
                return righto(chooseChallenge, serverAddress, challengesList);
            }

            return name;
        });

    challengeName(callback);
}

function launchEditor(launchEditorCommand, challengePath, callback){
    if(launchEditorCommand !== false){
        spawn(launchEditorCommand, ['.'], { cwd: challengePath, env: process.env });
    }

    callback();
}

function executeChallenge(challengeName, challengePath, serverAddress, name, callback){
    console.log(
        '\n### FEEL FREE TO USE ANOTHER TERMINAL TO TEST / DEBUG YOUR CODE ###\n',
        '        Just come back here and (R)un it when you\'re done :)\n\n'
    );

    var which = prompt('(R)un the tests or (c)hoose another challenge: ', 'r').toLowerCase();

    if(which === 'c'){
        return callback();
    }

    var rerun = executeChallenge.apply.bind(executeChallenge, null, arguments);

    makeRequest({
        method: 'POST',
        url: serverAddress + '/results',
        json: {
            challenge: challengeName,
            name: name
        }
    }, ()=>{});

    var child = spawn('node', [challengePath + '/index.js'], { cwd: challengePath, env: process.env, stdio: [process.stdin, 'pipe', 'pipe'] });

    child.stdout.pipe(process.stdout);
    child.stderr.pipe(process.stderr);

    var lastChildOutput;
    var lastChildError;

    child.stdout.on('data', function(data){
        lastChildOutput = data.toString();
    });
    child.stderr.on('data', function(data){
        lastChildOutput = data.toString();
    });
    
    child.on('close', function(){

        if(lastChildError){
            console.log('Challenge errored!');
            makeRequest({
                method: 'PUT',
                url: serverAddress + '/results',
                json: {
                    challenge: challengeName,
                    name: name,
                    result: 'error'
                }
            }, function(error, result){
                rerun();
            });
            return;
        }

        var result = lastChildOutput.split('\n').filter(x=>x).pop();
        result = (result && result.trim() === '# ok') ? 'pass' : 'fail';

        console.log('\nChallenge completed, result:', result);
        makeRequest({
            method: 'PUT',
            url: serverAddress + '/results',
            json: {
                challenge: challengeName,
                name: name,
                result: result
            }
        }, function(error, result){
            rerun();
        });
    });
}

console.log('\nAsync Challenges.\n');
var defaultName = 'Node developer ' + parseInt(Math.random() * 100);
var name = righto.sync(prompt, 'What\'s your name?: (Default ' + defaultName + '): ', defaultName);
var launchEditorCommand = righto.sync(prompt, 'How do  you launch your editor? If you don\'t know, type `N` (Default `N`): ', 'N', righto.after(name))
    .get(command => command.toLowerCase() === 'n' ? false : command);
var serverAddress = righto(getServerAddress, righto.after(launchEditorCommand));
var challengesList = righto(getChallengesList, serverAddress);

function challengePrompt(error){
    if(error){
        console.log(error);
    }
    var challengeName = righto(chooseChallenge, serverAddress, challengesList);
    var challengeLoaded = righto(loadChallenge, serverAddress, challengeName);
    var editorLaunched = righto(launchEditor, launchEditorCommand, challengeLoaded);
    var challengeExecuted = righto(executeChallenge, challengeName, challengeLoaded, serverAddress, name, righto.after(editorLaunched));

    challengeExecuted(challengePrompt);
}

challengePrompt();