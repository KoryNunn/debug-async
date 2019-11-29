var fs = require('fs');
var mkdirp = require('mkdirp');
var righto = require('righto');
var createPrompt = require('prompt-sync');
var makeRequest = require('make-json-request');
var request = require('request');
var unzip = require('unzipper');
var path = require('path');
var spawn = require('child_process').spawn;
var spawnSync = require('child_process').spawnSync;
var exec = require('child_process').exec;
var chalk = require('chalk');

var prompt = createPrompt({
        sigint: true
    });

var challengesDirectory = __dirname + '/challenges';
var sessionPath = path.join(__dirname, './session.json');

mkdirp.sync(challengesDirectory);

function complete(commands) {
    return function (str) {
        var i;
        var ret = [];
        for (i=0; i< commands.length; i++) {
            if (commands[i].toLowerCase().indexOf(str.toLowerCase()) == 0){
                ret.push(commands[i]);
            }
        }
        return ret;
    };
};

function getServerAddress(defaultAddress, callback){
    var serverAddress = prompt('Where\'s the server?: (Default: ' + defaultAddress + ')', defaultAddress);
    if(serverAddress.indexOf('http') !== 0){
        serverAddress = 'http://' + serverAddress;
    }

    makeRequest(serverAddress + '/ping', function(error, result){
        if(error || result !== 'totes legit'){
            console.log('Server not found, try again.');
            return getServerAddress(defaultAddress, callback);
        }

        callback(null, serverAddress);
    });
}

function getChallengesList(serverAddress, callback){
    console.log('Loading list of challenges...');

    makeRequest(serverAddress + '/challenges', function(error, result){
        if(error){
            if(prompt('Something went wrong, retry? (Y/n): ').toLowerCase() !== 'n'){
                return getChallengesList(serverAddress, callback);
            }
            return  callback('Could not load challenge list');
        }

        callback(null, result);
    });
}

function loadChallenge(serverAddress, challengeName, callback){
    var challengePath = challengesDirectory + '/' + challengeName;
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
        return challengePath;
    });

    complete(callback);
}

function chooseChallenge(serverAddress, challengesList, callback){
    console.log('Available Challenges:');
    console.log(challengesList.map(x => '  ' + chalk.green(x)).join('\n'));
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
    var sessionId = righto(makeRequest, {
        method: 'POST',
        url: serverAddress + '/results',
        json: {
            challenge: challengeName,
            name: name
        }
    });

    var runs = 0;

    function rerun(){
        runs++;
        sessionId(function(error, sessionId){
            console.log(sessionId)
            if(error){
                return callback(error)
            }

            var firstRun = runs === 1;

            if(firstRun){
                console.log(chalk.green.bold(
                    '\n FEEL FREE TO USE ANOTHER TERMINAL TO TEST / DEBUG YOUR CODE\n',
                    '      Just come back here and (R)un it when you\'re done :)\n\n'
                ));
                console.log(chalk.yellow('Challenge directory:'), './' + path.relative(process.cwd(), challengePath), '\n');
            }


            var which = firstRun ? 'R' : prompt('(R)un the tests or (c)hoose another challenge: ', 'r').toLowerCase();

            if(which === 'c'){
                return callback();
            }

            var child = spawn('node', [challengePath + '/index.js'], { cwd: challengePath, env: process.env, stdio: [process.stdin, 'pipe', 'pipe'] });

            child.stdout.pipe(process.stdout);
            child.stderr.pipe(process.stderr);

            var output;
            var errored;

            child.stdout.on('data', function(data){
                output += data.toString();
            });

            child.on('close', function(){
                var result = output.match(/^# ok$/m)
                    ? 'pass'
                    : output.match(/^# fail\s+\d+$/m)
                        ? 'fail' : 'error';

                if (result === 'error') {
                    console.log('Challenge errored!');
                } else {
                    console.log('\nChallenge completed, result:', chalk[result === 'pass' ? 'green' : 'red'](result));
                }

                if(firstRun){
                    return rerun();
                }

                makeRequest({
                    method: 'PUT',
                    url: serverAddress + '/results',
                    json: {
                        challenge: challengeName,
                        name: name,
                        result,
                        sessionId
                    }
                }, function(error, result){
                    rerun();
                });
            });
        });
    }

    rerun()
}

function loadSession(callback){
    var defaultSession = {
        name: 'Node developer ' + parseInt(Math.random() * 100),
        serverAddress: 'https://debug-async.korynunn.com'
    };

    var maybeSessionFile = righto(fs.readFile, sessionPath)
        .get(function(file){
            try{
                return {
                    ...defaultSession,
                    ...JSON.parse(file)
                };
            }catch(error){
                return righto.fail('JSON Parse fail');
            }
        });
    var session = righto.handle(maybeSessionFile, function(error, done){
        done(null, {
            ...defaultSession
        });
    });

    session(callback);
}

function saveSession(name, serverAddress, callback){
    fs.writeFile(sessionPath, JSON.stringify({name, serverAddress}), callback);
}

console.log('\nAsync Challenges.\n');
var existingSession = righto(loadSession);
var name = existingSession.get(session => prompt('What\'s your name?: (Default ' + session.name + '): ', session.name));
var serverAddress = existingSession.get('serverAddress');
var challengesList = righto(getChallengesList, serverAddress);
var sessionSaved = righto(saveSession, name, serverAddress)();

function challengePrompt(error){
    if(error){
        console.log(error);
    }

    var challengeName = righto(chooseChallenge, serverAddress, challengesList);
    var challengeLoaded = righto(loadChallenge, serverAddress, challengeName);
    var challengeExecuted = righto(executeChallenge, challengeName, challengeLoaded, serverAddress, name);

    challengeExecuted(challengePrompt);
}

challengePrompt();