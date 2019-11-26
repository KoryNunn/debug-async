module.exports = {
    port: process.env['PORT'] || 8080,
    databaseToken: process.env['DATABASE_TOKEN'] || 'test',
    bitabaseEndpoint: 'http://localhost:8000/v1/databases/asyncdebuggingresults',
    // bitabaseEndpoint: 'https://api.bitabase.net/v1/databases/asyncdebuggingresults',
    bitabaseSessionId: process.env['BITABASE_SESSION_ID'],
    bitabaseSessionSecret: process.env['BITABASE_SESSION_SECRET'],
    collectionEndpoint: collection => `http://localhost:8000/v1/databases/asyncdebuggingresults/records/${collection}`
    // collectionEndpoint: collection => `https://asyncdebuggingresults.bitabase.net/${collection}`
}