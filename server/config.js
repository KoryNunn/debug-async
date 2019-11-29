module.exports = {
    port: process.env['HOST_PORT'] || 8080,
    databaseToken: process.env['DATABASE_TOKEN'] || 'test',
    // bitabaseEndpoint: 'http://localhost:8000/v1/databases/debug-async-results',
    bitabaseEndpoint: 'https://api.bitabase.net/v1/databases/debug-async-results',
    bitabaseSessionId: process.env['BITABASE_SESSION_ID'],
    bitabaseSessionSecret: process.env['BITABASE_SESSION_SECRET'],
    // collectionEndpoint: collection => `http://localhost:8000/v1/databases/debug-async-results/records/${collection}`
    collectionEndpoint: collection => `https://debug-async-results.bitabase.net/${collection}`
}