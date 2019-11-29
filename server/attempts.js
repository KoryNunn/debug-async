var righto = require('righto');
var callarest = require('callarest/json');
var {
    databaseToken,
    bitabaseEndpoint,
    bitabaseSessionId,
    bitabaseSessionSecret
} = require('./config');

function updateAttemptsCollection(callback){
    var schema = {
        name: 'attempts',

        transducers: [
            `body.token === "${databaseToken}" ? '' : reject(401 "Invalid token")`,
            '{ ...body delete token }'
        ],

        presenters: [
            '{ ...record time: Number(record.time) }'
        ]
    }

    var created = righto(callarest, {
        method: 'post',
        url: `${bitabaseEndpoint}/collections`,
        data: schema,
        headers: {
            'X-Session-Id': bitabaseSessionId || '',
            'X-Session-Secret': bitabaseSessionSecret || ''
        }
    })
    .get(result => result.response.statusCode >= 300 ? righto.fail(result.body) : result);

    var updated = righto.handle(created, function(error, done){
        callarest({
            method: 'put',
            url: `${bitabaseEndpoint}/collections/attempts`,
            data: schema,
            headers: {
                'X-Session-Id': bitabaseSessionId || '',
                'X-Session-Secret': bitabaseSessionSecret || ''
            }
        }, done)
    })
    .get(result => result.response.statusCode >= 300 ? righto.fail(result.body) : result.body);

    updated(error => {
        if(error){
            console.error('ERROR UPDATING COLLECTION', error)
        } else {
            console.log('Successfully updated collection')
        }
    })

    updated(callback);
}

var attemptsReady;

module.exports = function(){
    return attemptsReady || (attemptsReady = righto(updateAttemptsCollection))
}
