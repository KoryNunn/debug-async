var errors = require('generic-errors');
var Stream = require('stream');

module.exports = function handle(wrapper, handler){
    if(!handler){
        handler = wrapper;
        wrapper = (x)=>x;
    }
    return wrapper(function(request, response){
        var args = Array.prototype.slice.call(arguments, 2);
        handler.apply({request, response}, args.concat(function(error, result){
            if(error){
                if(error instanceof errors.BaseError){
                    response.writeHead(error.code);
                    response.end(JSON.stringify(error));
                }else{
                    console.error('Server Error', error)
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
                response.end(result);
                return;
            }

            response.end(JSON.stringify(result));
        }));
    });
};