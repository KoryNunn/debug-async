var righto = require('righto');
var callarest = require('callarest/json');
var {
    databaseToken,
    bitabaseEndpoint,
    bitabaseSessionId,
    bitabaseSessionSecret
} = require('./config');

function updateAttemptsCollection(callback){
    var validToken = `data.token === ${databaseToken} ? null : "401"`;

    var schema = {
        name: 'attempts',

        schema: {
            id: ['required', 'number'],
            time: ['required', 'number'],
            result: ['string'],
            name: ['required', 'string'],
            challenge: ['required', 'string']
        },

        mutations: [
            '{ ...body delete token }'
        ],

        rules: {
            POST: [ validToken ],
            PUT: [ validToken ],
            PATCH: [ validToken ],
            DELETE: [ validToken ]
        }
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
    .get(result => result.response.statusCode >= 300 ? righto.fail(result.body) : result.body);

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
    .get(result => result.response.statusCode >= 300 ? righto.fail(result.body) : result.body)(console.log);

    updated(callback)
}

var attemptsReady;

module.exports = function(){
    return attemptsReady || (attemptsReady = righto(updateAttemptsCollection))
}