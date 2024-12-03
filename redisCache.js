const Redis = require('ioredis');
require('dotenv').config();

// Create a Redis client using the REDIS_URL from environment variables
const redis = new Redis(process.env.REDIS_URL, {
    tls: {
      rejectUnauthorized: false, // Allow self-signed certificates
    },
  });

// Function to set a value in Redis
async function setCache(key, value) {
    await redis.set(key, value);
}

// Function to get a value from Redis
async function getCache(key) {
    return await redis.get(key);
}

module.exports = { setCache, getCache };
