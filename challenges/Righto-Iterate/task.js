var righto = require('righto');
var fs = require('fs');

module.exports = righto.iterate(function*(){
    var filePaths = yield fs.readFile(__dirname + '/test.txt', 'utf8');

    var fileNames = filePaths.spilt('\n');

    var files = [];

    for(var i = 0; i < fileNames.length; i++){
        files.push(yield fs.readFile(__dirname + '/' + fileNames[i] + '.txt', 'utf8'));
    }

    return files;
});