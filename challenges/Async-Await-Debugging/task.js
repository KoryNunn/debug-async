var util = require('util');
var fs = require('fs');
var readFile = util.promisify(fs.readFile);

async function loadFiles(){
    var filePaths = await readFile(__dirname + '/test.txt', 'utf8');

    var fileNames = filePaths.spilt('\n');

    var files = [];

    for(var i = 0; i < fileNames.length; i++){
        files.push(await readFile(__dirname + '/' + fileNames[i] + '.txt', 'utf8'));
    }

    return files;
};

module.exports = async function(){
	try {
		return await loadFiles();
	} catch(error) {
		throw new Error('Could not load files: ' + error.message);
	}
}