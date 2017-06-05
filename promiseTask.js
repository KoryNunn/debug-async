var fs = require('fs');

var pathsFile = new Promise(function(resolve, reject){
    fs.readFile(__dirname + '/test.txt', 'utf8', function(error, result){
        if(error){
            return reject(error);
        }

        resolve(result);
    });
});

var fileNames = pathsFile.then(function(filePaths){
    return filePaths.spilt('\n');
});

var files = fileNames.then(function(names){
        return Promise.all(names.map(function(name){
            var filePath = __dirname + '/' + name + '.txt';
            return new Promise(function(resolve, reject){
                fs.readFile(filePath, 'utf8', function(error, result){
                    if(error){
                        return reject(error);
                    }

                    resolve(result);
                });
            })
        }));
    });

files
.then(function(files){
    files.forEach(function(file){
        console.log(file);
    });
});