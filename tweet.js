const { TwitterApi } = require('twitter-api-v2');
require('dotenv').config();
const { refreshAccessToken } = require('./auth');
const { getCache } = require('./redisCache');

async function tweet(status) {
    try {
        const accessToken = await getCache('ACCESS_TOKEN');
        let client = new TwitterApi(accessToken);

        const response = await client.v2.tweet(status);
        console.log('Tweet successful:', response);
    } catch (error) {
        console.error('Error tweeting:', error);
        if (error.code === 401) {
            console.log('Unauthorized error, attempting to refresh access token...');
            await refreshAccessToken();

            // Reinitialize the client with the new access token from cache
            const newAccessToken = await getCache('ACCESS_TOKEN');

            // Overwrite the current client instance with a new one
            client = new TwitterApi(newAccessToken);

            // Retry tweeting after refreshing the token
            try {
                const retryResponse = await client.v2.tweet(status);
                console.log('Retry tweet successful:', retryResponse);
            } catch (retryError) {
                console.error('Retry tweeting failed:', retryError);
            }
        }
    }
}

module.exports = { tweet };