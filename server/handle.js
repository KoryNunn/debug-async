var errors = require('generic-errors');
var Stream = require('stream');

module.exports = function handle(handler){
    return function(request, response, tokens){
        handler(tokens, function(error, result){
            if(error){
                if(error instanceof errors.BaseError){
                    response.writeHead(error.code);
                    response.end(JSON.stringify(error));
                }else{
                    response.writeHead(500);
                    response.end();
                }
                return;
            }

            if(result instanceof Stream){
                result.pipe(response);
                return;
            }

            if(result instanceof Buffer){
                result.pipe(response);
                return;
            }

            response.end(JSON.stringify(result));
        });
    }
};