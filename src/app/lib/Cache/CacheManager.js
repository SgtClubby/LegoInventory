// src/app/lib/Cache/CacheManager.js

import dbConnect from "@/lib/Mongo/Mongo";
import {
  BrickMetadata,
  MinifigMetadata,
  MinifigPriceMetadata,
} from "@/lib/Mongo/Schema";

/**
 * Cache manager for handling data caching across the application
 */
class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.memoryCacheExpiry = new Map();
    this.DEFAULT_MEMORY_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
  }

  /**
   * Set item in memory cache with expiration
   *
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   */
  setMemoryCache(key, value, ttl = this.DEFAULT_MEMORY_TTL) {
    this.memoryCache.set(key, value);
    const expiryTime = Date.now() + ttl;
    this.memoryCacheExpiry.set(key, expiryTime);

    // Set up expiration
    setTimeout(() => {
      if (this.memoryCacheExpiry.get(key) === expiryTime) {
        this.memoryCache.delete(key);
        this.memoryCacheExpiry.delete(key);
      }
    }, ttl);
  }

  /**
   * Get item from memory cache if it exists and isn't expired
   *
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if not found/expired
   */
  getMemoryCache(key) {
    if (!this.memoryCache.has(key)) return null;

    const expiryTime = this.memoryCacheExpiry.get(key);
    if (expiryTime < Date.now()) {
      this.memoryCache.delete(key);
      this.memoryCacheExpiry.delete(key);
      return null;
    }

    return this.memoryCache.get(key);
  }

  /**
   * Fetch brick metadata from database cache
   *
   * @param {string} elementId - Brick element ID
   * @returns {Promise<Object|null>} Brick metadata or null if not found
   */
  async getBrickMetadata(elementId) {
    const cacheKey = `brick-${elementId}`;
    const cachedData = this.getMemoryCache(cacheKey);

    if (cachedData) return cachedData;

    try {
      await dbConnect();
      const metadata = await BrickMetadata.findOne(
        { elementId, invalid: false },
        { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
      ).lean();

      if (metadata) {
        this.setMemoryCache(cacheKey, metadata);
        return metadata;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching brick metadata for ${elementId}:`, error);
      return null;
    }
  }

  /**
   * Store brick metadata in database cache
   *
   * @param {Object} metadata - Brick metadata to store
   * @returns {Promise<boolean>} Success status
   */
  async setBrickMetadata(metadata) {
    if (!metadata || !metadata.elementId) return false;

    try {
      await dbConnect();
      await BrickMetadata.updateOne(
        { elementId: metadata.elementId },
        { $set: metadata },
        { upsert: true }
      );

      const cacheKey = `brick-${metadata.elementId}`;
      this.setMemoryCache(cacheKey, metadata);

      return true;
    } catch (error) {
      console.error(`Error storing brick metadata:`, error);
      return false;
    }
  }

  /**
   * Fetch minifig metadata from database cache
   *
   * @param {string} minifigId - Minifig ID (Rebrickable)
   * @returns {Promise<Object|null>} Minifig metadata or null if not found
   */
  async getMinifigMetadata(minifigId) {
    const cacheKey = `minifig-${minifigId}`;
    const cachedData = this.getMemoryCache(cacheKey);

    if (cachedData) return cachedData;

    try {
      await dbConnect();
      const metadata = await MinifigMetadata.findOne(
        { minifigIdRebrickable: minifigId },
        { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
      ).lean();

      const priceData = await MinifigPriceMetadata.findOne(
        { minifigIdRebrickable: minifigId },
        { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
      ).lean();

      if (metadata) {
        const result = {
          ...metadata,
          priceData: priceData?.priceData || null,
        };

        this.setMemoryCache(cacheKey, result);
        return result;
      }

      return null;
    } catch (error) {
      console.error(`Error fetching minifig metadata for ${minifigId}:`, error);
      return null;
    }
  }

  /**
   * Store minifig metadata in database cache
   *
   * @param {Object} metadata - Minifig metadata to store
   * @param {Object} priceData - Optional price data to store
   * @returns {Promise<boolean>} Success status
   */
  async setMinifigMetadata(metadata, priceData = null) {
    if (!metadata || !metadata.minifigIdRebrickable) return false;

    try {
      await dbConnect();

      // Store metadata
      await MinifigMetadata.updateOne(
        { minifigIdRebrickable: metadata.minifigIdRebrickable },
        { $set: metadata },
        { upsert: true }
      );

      // Store price data if provided
      if (priceData) {
        await MinifigPriceMetadata.updateOne(
          { minifigIdRebrickable: metadata.minifigIdRebrickable },
          { $set: { priceData } },
          { upsert: true }
        );
      }

      const cacheKey = `minifig-${metadata.minifigIdRebrickable}`;
      this.setMemoryCache(cacheKey, { ...metadata, priceData });

      return true;
    } catch (error) {
      console.error(`Error storing minifig metadata:`, error);
      return false;
    }
  }

  /**
   * Clear all in-memory caches
   */
  clearMemoryCache() {
    this.memoryCache.clear();
    this.memoryCacheExpiry.clear();
  }
}

// Export a singleton instance
const cacheManager = new CacheManager();
export default cacheManager;
