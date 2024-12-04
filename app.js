const _ = require('lodash');
const moment = require('moment');
const { ethers } = require('ethers');
const tweet = require('./tweet');
const { getCache, setCache, initializeCacheWithEnvVars } = require('./redisCache');
const { OpenSeaSDK, Chain } = require('opensea-js');
require('dotenv').config();

// Format tweet text
async function formatAndSendTweet(event) {
    const tokenName = _.get(event, ['nft', 'name'], 'Unknown Token');
    const openseaLink = _.get(event, ['nft', 'opensea_url'], '#');
    const totalPrice = _.get(event, ['payment', 'quantity'], '0');
    const formattedEthPrice = ethers.utils.formatUnits(totalPrice, _.get(event, ['payment', 'decimals'], 18));
    let tweetText;

    tweetText = `${tokenName} bought for ${formattedEthPrice}Ξ ${openseaLink}`;
    console.log(tweetText);
    return await tweet.tweet(tweetText);
}

// Initialize a provider using ethers.js
const provider = new ethers.providers.JsonRpcProvider(`https://mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`);

// Initialize OpenSeaSDK
const openseaSDK = new OpenSeaSDK(provider, {
  chain: Chain.Mainnet,
  apiKey: process.env.OPEN_SEA_API_KEY,
});

// Add a flag to deactivate cache for testing purposes
const useCache = process.env.USE_CACHE !== 'false' && process.env.USE_CACHE !== undefined;

// Ensure cache is initialized before any operations
async function initializeAndRunApp() {
    await initializeCacheWithEnvVars();
    
    // Poll OpenSea every 6 seconds & retrieve all sales for a given collection
    setInterval(async () => {
        const lastSaleTime = useCache ? await getCache('lastSaleTime') : null;
        console.log(`Retrieved lastSaleTime from cache: ${lastSaleTime}`);
        const initialTime = moment().subtract(1, 'minute').unix();

        // Validate lastSaleTime
        const isValidTimestamp = (timestamp) => Number.isInteger(timestamp) && timestamp > 1000000000;
        const occurredAfter = (isValidTimestamp(lastSaleTime) ? lastSaleTime : initialTime);

        console.log(`Cache lastSaleTime: ${lastSaleTime}`);
        console.log(`Using occurredAfter: ${occurredAfter} (${moment.unix(occurredAfter).format('MMMM Do YYYY, h:mm:ss a')})`);

        openseaSDK.api.get(`/api/v2/events/collection/${process.env.COLLECTION_SLUG}`, {
            event_type: 'sale',
            after: occurredAfter
        }).then(async ({ asset_events }) => {
            const sortedEvents = _.sortBy(asset_events, function(event) {
                const created = _.get(event, 'event_timestamp');
                return new Date(created);
            });

            const occurredAfterFormatted = moment.unix(occurredAfter).format('MMMM Do YYYY, h:mm:ss a');
            console.log(`${asset_events.length} sales since ${occurredAfterFormatted}...`);

            for (const event of sortedEvents) {
                const created = _.get(event, 'event_timestamp');
                console.log(`Processing sale event with timestamp: ${created} and event ID: ${event.id}`);
                if (useCache) {
                    const newLastSaleTime = moment(created).unix();
                    console.log(`Updating lastSaleTime in cache to: ${newLastSaleTime}`);
                    await setCache('lastSaleTime', newLastSaleTime);
                    console.log(`Successfully set new lastSaleTime in cache: ${newLastSaleTime}`);
                }
                console.log(`Sending tweet for event with ID: ${event.id}`);
                await formatAndSendTweet(event);
                console.log(`Tweet sent for event with ID: ${event.id}`);
            }
        }).catch(err => console.error(err));
    }, 60000);
}

// Run the initialization and app operations
initializeAndRunApp();
