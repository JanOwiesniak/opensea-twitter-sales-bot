const { TwitterApi } = require('twitter-api-v2');
const fs = require('fs');
const { setCache, getCache } = require('./redisCache');
require('dotenv').config();
const { EventEmitter } = require('events');
const authEmitter = new EventEmitter();

// Create a partial client for auth links
const twitterClient = new TwitterApi({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
});

// Generate OAuth 2.0 Auth Link
async function generateAuthLink() {
    const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(process.env.CALLBACK_URL, {
        scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    });
    console.log('Authorization URL:', url);
    return { codeVerifier, state };
}

async function exchangeToken(codeVerifier, code) {
    console.log('Using authorization code:', code);
    const { client: rwClient, accessToken, refreshToken } = await twitterClient.loginWithOAuth2({
        code: code,
        codeVerifier: codeVerifier,
        redirectUri: process.env.CALLBACK_URL,
    });

    // Store these tokens in your .env file for future use
    let envContent = '';
    try {
        envContent = fs.readFileSync('.env', 'utf8');
        if (!envContent.includes('ACCESS_TOKEN')) {
            envContent += `\nACCESS_TOKEN=${accessToken}`;
        } else {
            envContent = envContent.replace(/ACCESS_TOKEN=.*/g, `ACCESS_TOKEN=${accessToken}`);
        }
        if (!envContent.includes('REFRESH_TOKEN')) {
            envContent += `\nREFRESH_TOKEN=${refreshToken}`;
        } else {
            envContent = envContent.replace(/REFRESH_TOKEN=.*/g, `REFRESH_TOKEN=${refreshToken}`);
        }
        fs.writeFileSync('.env', envContent);
        console.log('.env file updated with new tokens.');
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log('.env file not found, skipping update.');
        } else {
            throw error;
        }
    }

    // Store tokens in Redis
    await setCache('ACCESS_TOKEN', accessToken);
    await setCache('REFRESH_TOKEN', refreshToken);
    authEmitter.emit('tokensFetched');
}

async function refreshAccessToken() {
    try {
        const currentRefreshToken = await getCache('REFRESH_TOKEN');
        console.log('Current refresh token from cache:', currentRefreshToken);
        const { accessToken, refreshToken } = await twitterClient.refreshOAuth2Token(currentRefreshToken);
        console.log('Access token refreshed successfully. New access token:', accessToken);
        console.log('New refresh token received:', refreshToken);

        // Update the .env file with the new tokens
        let envContent = '';
        try {
            envContent = fs.readFileSync('.env', 'utf8');
            envContent = envContent.replace(/ACCESS_TOKEN=.*/g, `ACCESS_TOKEN=${accessToken}`);
            envContent = envContent.replace(/REFRESH_TOKEN=.*/g, `REFRESH_TOKEN=${refreshToken}`);
            fs.writeFileSync('.env', envContent);
            console.log('.env file updated with new tokens.');
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.log('.env file not found, skipping update.');
            } else {
                throw error;
            }
        }

        // Ensure new tokens are stored in Redis
        await setCache('ACCESS_TOKEN', accessToken);
        await setCache('REFRESH_TOKEN', refreshToken);
        console.log('Tokens updated in cache.');

        authEmitter.emit('tokensFetched');
    } catch (error) {
        console.error('Error refreshing access token:', error);
        if (error.response) {
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);
            console.error('Response headers:', error.response.headers);
        }
    }
}

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

module.exports = { generateAuthLink, exchangeToken, refreshAccessToken, checkTokenValidity, authEmitter };