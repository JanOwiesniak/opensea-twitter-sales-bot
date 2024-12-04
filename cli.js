const { generateAuthLink, exchangeToken, authEmitter, refreshAccessToken, checkTokenValidity } = require('./auth');
const { tweet } = require('./tweet');
require('dotenv').config();
const { getCache, initializeCacheWithEnvVars } = require('./redisCache');
const fs = require('fs');

async function handleAuthFlow() {
    const { codeVerifier } = await generateAuthLink();

    // Wait for the user to authorize the app
    const { server } = require('./server');
    authEmitter.on('authorized', async (code) => {
        console.log('Authorization complete. Proceeding with token exchange...');
        // Now perform the token exchange
        await exchangeToken(codeVerifier, code);
        server.close(() => {
            console.log('Auth server is shutting down...');
            // Ensure process exits after server is closed
            process.exit(0);
        });
    });
}

// CLI to initialize the auth flow, tweet, check token validity, verify access token, or refresh token
async function main() {
    const args = process.argv.slice(2);
    console.log('Arguments received:', args);
    if (args.includes('--auth')) {
        console.log('Initializing auth flow...');
        await handleAuthFlow().catch(console.error);
    } else if (args.includes('--tweet')) {
        const tweetIndex = args.indexOf('--tweet');
        const tweetText = args.slice(tweetIndex + 1).join(' ');
        if (tweetText) {
            console.log('Tweeting:', tweetText);
            tweet(tweetText).catch(console.error);
        } else {
            console.error('No tweet text provided.');
            throw new Error('No tweet text provided.');
        }
    } else if (args.includes('--check-token')) {
        console.log('Checking token validity...');
        await checkTokenValidity();
        process.exit(0); 
    } else if (args.includes('--init-cache')) {
        console.log('Initializing cache with environment variables...');
        await initializeCacheWithEnvVars();
        console.log('Cache initialized successfully.');
        process.exit(0);
    } else if (args.includes('--show-token')) {
        const accessToken = await getCache('ACCESS_TOKEN');
        const refreshToken = await getCache('REFRESH_TOKEN');
        console.log('Access Token:', accessToken);
        console.log('Refresh Token:', refreshToken);
        process.exit(0);
    } else if (args.includes('--refresh-token')) {
        console.log('Refreshing token...');
        await refreshAccessToken();
        if (fs.existsSync('.env')) {
            console.log('ACCESS_TOKEN and REFRESH_TOKEN stored in .env file.');
        } else {
            console.log('.env file does not exist. Tokens will not be stored.');
        }
        process.exit(0);
    } else {
        console.log('No valid arguments provided. Use --auth to start the authentication flow, --tweet "Your tweet text" to send a tweet, --check-token to verify token validity, --show-token to print the access token and refresh token, --init-cache to initialize the cache, or --refresh-token to refresh the access token.');
        throw new Error('No valid arguments provided.');
    }
}

// Run the initialization and CLI operations
main().then(() => {
}).catch(error => {
    console.error('Error during CLI operations:', error);
    process.exit(1);
});
