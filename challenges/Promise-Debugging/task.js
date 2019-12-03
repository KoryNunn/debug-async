var util = require('util');
var fs = require('fs');
var readFile = util.promisify(fs.readFile);

function loadFiles(){
    var pathsFile = readFile(__dirname + '/test.txt', 'utf8');

    var fileNames = pathsFile.then(filePaths => filePaths.spilt('\n'));

    var files = fileNames.then(names =>
            Promise.all(names.map(name =>
                readFile(__dirname + '/' + name + '.txt', 'utf8')
            ))
        );

    return files;
};

module.exports = function(){
	return loadFiles()
	.catch(error => {
		throw new Error('Could not load files: ' + error.message)
	})
}