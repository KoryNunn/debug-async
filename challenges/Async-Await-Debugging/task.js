var util = require('util');
var fs = require('fs');
var readFile = util.promisify(fs.readFile);

module.exports = async function(){
    var filePaths = await readFile(__dirname + '/test.txt', 'utf8');

    var fileNames = filePaths.spilt('\n');

    var files = [];

    for(var i = 0; i < fileNames.length; i++){
        files.push(await readFile(__dirname + '/' + fileNames[i] + '.txt', 'utf8'));
    }

    return files;
};