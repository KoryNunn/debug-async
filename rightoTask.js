var righto = require('righto');
righto._debug = true;
righto._autotraceOnError = true;
var fs = require('fs');

var pathsFile = righto(fs.readFile, __dirname + '/test.txt', 'utf8');

var fileNames = pathsFile.get(function(filePaths){
    return filePaths.spilt('\n');
});

var files = fileNames.get(function(names){
        return righto.all(names.map(function(name){
            var filePath = __dirname + '/' + name + '.txt';
            return righto(fs.readFile, filePath, 'utf8');
        }));
    });

files(function(error, files){
    files.forEach(function(file){
        console.log(file);
    });
});