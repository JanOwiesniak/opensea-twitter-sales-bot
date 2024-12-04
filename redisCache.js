const Redis = require('ioredis');
require('dotenv').config();

// Create a Redis client using the REDIS_URL from environment variables
const redis = new Redis(process.env.REDIS_URL, process.env.NODE_ENV === 'production' ? {
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  } : {});

// Function to set a value in Redis
async function setCache(key, value) {
    try {
        await redis.set(key, value);
    } catch (error) {
        console.error(`Error setting cache for key: ${key}`, error);
    }
}

// Function to get a value from Redis
async function getCache(key) {
    try {
        const value = await redis.get(key);
        return value;
    } catch (error) {
        console.error(`Error getting cache for key: ${key}`, error);
        return null;
    }
}

// Function to initialize cache with environment variables
async function initializeCacheWithEnvVars() {
    for (const [key, value] of Object.entries(process.env)) {
        const cachedValue = await getCache(key);
        if (!cachedValue) {
            await setCache(key, value);
        } else {
        }
    }
}

// Export the cache functions and initializeCacheWithEnvVars
module.exports = { setCache, getCache, initializeCacheWithEnvVars };
