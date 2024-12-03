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
    let envContent = fs.readFileSync('.env', 'utf8');
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

    // Store tokens in Redis
    await setCache('ACCESS_TOKEN', accessToken);
    await setCache('REFRESH_TOKEN', refreshToken);
    authEmitter.emit('tokensFetched');
}

async function refreshAccessToken() {
    try {
        const refreshToken = await getCache('REFRESH_TOKEN');
        const { client: refreshedClient, accessToken, newRefreshToken } = await twitterClient.refreshOAuth2Token(refreshToken);
        console.log('Access token refreshed successfully. New access token:', accessToken);

        // Update the .env file with the new tokens
        let envContent = fs.readFileSync('.env', 'utf8');
        envContent = envContent.replace(/ACCESS_TOKEN=.*/g, `ACCESS_TOKEN=${accessToken}`);
        envContent = envContent.replace(/REFRESH_TOKEN=.*/g, `REFRESH_TOKEN=${newRefreshToken}`);
        fs.writeFileSync('.env', envContent);

        // Store new tokens in Redis
        await setCache('ACCESS_TOKEN', accessToken);
        await setCache('REFRESH_TOKEN', newRefreshToken);
        authEmitter.emit('tokensFetched');
    } catch (error) {
        console.error('Error refreshing access token:', error);
    }
}

module.exports = { generateAuthLink, exchangeToken, refreshAccessToken, authEmitter };