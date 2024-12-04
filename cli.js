const { generateAuthLink, exchangeToken, authEmitter } = require('./auth');
const { tweet } = require('./tweet');
const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
require('dotenv').config();
const { setCache, getCache, initializeCacheWithEnvVars } = require('./redisCache');

async function checkTokenValidity() {
    try {
        const accessToken = await getCache('ACCESS_TOKEN');
        const client = new TwitterApi(accessToken);
        const user = await client.v2.me();
        console.log('Token is valid. Authenticated as:', user.data.username);
    } catch (error) {
        console.error('Token is invalid or expired:', error);
    }
}

async function refreshToken() {
    try {
        const client = new TwitterApi({
            clientId: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
        });
        const refreshToken = await getCache('REFRESH_TOKEN');
        const { client: _refreshedClient, accessToken, refreshToken: newRefreshToken } = await client.refreshOAuth2Token(refreshToken);
        console.log('Token refreshed successfully. New access token:', accessToken);

        // Replace the existing tokens in the .env file
        let envContent = fs.readFileSync('.env', 'utf8');
        envContent = envContent.replace(/ACCESS_TOKEN=.*/g, `ACCESS_TOKEN=${accessToken}`);
        envContent = envContent.replace(/REFRESH_TOKEN=.*/g, `REFRESH_TOKEN=${newRefreshToken}`);
        fs.writeFileSync('.env', envContent);

        // Store tokens in Redis
        await setCache('ACCESS_TOKEN', accessToken);
        await setCache('REFRESH_TOKEN', refreshToken);
    } catch (error) {
        console.error('Error refreshing token:', error);
    }
}

async function handleAuthFlow() {
    const { codeVerifier } = await generateAuthLink();

    // Wait for the user to authorize the app
    const { server } = require('./server');
    authEmitter.on('authorized', async (code) => {
        console.log('Authorization complete. Proceeding with token exchange...');
        // Now perform the token exchange
        await exchangeToken(codeVerifier, code);
        server.close(() => {
            console.log('Auth server is shutting down: ACCESS_TOKEN and REFRESH_TOKEN stored in .env file.');
        });
    });
}

// CLI to initialize the auth flow, tweet, check token validity, verify access token, or refresh token
async function initializeAndRun() {
    await initializeCacheWithEnvVars();
    const args = process.argv.slice(2);
    console.log('Arguments received:', args);
    if (args.includes('--auth')) {
        console.log('Initializing auth flow...');
        handleAuthFlow().catch(console.error);
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
    } else if (args.includes('--refresh-token')) {
        console.log('Refreshing token...');
        await refreshToken();
    } else {
        console.log('No valid arguments provided. Use --auth to start the authentication flow, --tweet "Your tweet text" to send a tweet, --check-token to verify token validity, or --refresh-token to refresh the access token.');
        throw new Error('No valid arguments provided.');
    }
}

// Run the initialization and CLI operations
initializeAndRun().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Error during CLI operations:', error);
    process.exit(1);
});
