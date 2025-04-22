// src/app/lib/Config/config.js

/**
 * Application configuration loaded from environment variables
 */
const config = {
  // API Keys
  rebrickableApiKey: process.env.REBRICKABLE_APIKEY,
  
  // Database
  mongoDbUri: process.env.MONGODB_URI,
  mongoDbName: process.env.MONGODB_DB,
  mongoDbParams: process.env.MONGODB_PARAMS || '',
  
  // Cache expiration times (in milliseconds)
  cacheExpiry: {
    // Default values if not specified in environment
    brick: parseInt(process.env.CACHE_EXPIRY_BRICK || '2592000000'), // 30 days
    minifig: parseInt(process.env.CACHE_EXPIRY_MINIFIG || '604800000'), // 7 days
    price: parseInt(process.env.CACHE_EXPIRY_PRICE || '172800000'), // 2 days
    memory: 5 * 60 * 1000, // 5 minutes (in-memory cache)
  },
  
  // User agent for external API requests
  userAgent: 'LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)',
};

// Validate required configuration
if (!config.rebrickableApiKey) {
  console.warn('Warning: REBRICKABLE_APIKEY is not set in environment variables');
}

if (!config.mongoDbUri) {
  console.warn('Warning: MONGODB_URI is not set in environment variables');
}

if (!config.mongoDbName) {
  console.warn('Warning: MONGODB_DB is not set in environment variables');
}

export default config;
