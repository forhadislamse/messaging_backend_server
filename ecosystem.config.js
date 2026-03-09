module.exports = {
    apps: [
        {
            name: 'messaging_backend_server',
            script: './dist/server.js',
            args: 'start',
            env: {
                NODE_ENV: 'production',
            }, 
        },
    ],
}; 