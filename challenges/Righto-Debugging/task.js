var righto = require('righto');
righto._debug = true;
righto._autotraceOnError = true;
var fs = require('fs');

function loadFiles(callback){
    var pathsFile = righto(fs.readFile, __dirname + '/test.txt', 'utf8');

    var fileNames = pathsFile.get(filePaths => filePaths.spilt('\n'));

    var files = fileNames.get(names =>
            righto.all(names.map(name =>
                righto(fs.readFile, __dirname + '/' + name + '.txt', 'utf8')
            )
        ));

    files(callback);
};

module.exports = function(callback){
	var result = righto.handle(righto(loadFiles), (error, done) => {
		done(new Error('Could not load files: ' + error.message))
	});

	result(callback);
}