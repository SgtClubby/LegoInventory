// src/app/lib/Services/PriceHistoryService.js

import dbConnect from "@/lib/Mongo/Mongo";
import { MinifigPriceMetadata, MinifigPriceHistory } from "@/lib/Mongo/Schema";
import externalApiService from "@/lib/API/ExternalApiService";
import priceDataHandler from "@/lib/Services/PriceDataHandler";
import config from "@/lib/Config/config";

/**
 * Service for handling minifig price history
 */
class PriceHistoryService {
  /**
   * Check if price data is expired and needs updating
   *
   * @param {string} minifigIdRebrickable - Rebrickable ID of the minifig
   * @returns {Promise<boolean>} True if price data is expired
   */
  async isPriceDataExpired(minifigIdRebrickable) {
    try {
      await dbConnect();

      const priceData = await MinifigPriceMetadata.findOne(
        { minifigIdRebrickable },
        { expiresAt: 1, isExpired: 1 }
      ).lean();

      if (!priceData) return true;

      // If already marked as expired, return true
      if (priceData.isExpired) return true;

      // Check if expiration date has passed
      const now = new Date();
      return priceData.expiresAt < now;
    } catch (error) {
      console.error(
        `Error checking price expiration for ${minifigIdRebrickable}:`,
        error
      );
      return false;
    }
  }

  /**
   * Get the latest price data for a minifig, refreshing if expired
   *
   * @param {Object} minifig - Minifig data with IDs
   * @returns {Promise<Object>} Price data with trend information
   */
  async getLatestPriceData(minifig) {
    try {
      const { minifigIdRebrickable, minifigIdBricklink, minifigName } = minifig;

      if (!minifigIdRebrickable) {
        return {
          ...priceDataHandler.getDefaultPriceData(),
          trends: this.getDefaultTrends(),
        };
      }

      // Check if price data is expired
      const isExpired = await this.isPriceDataExpired(minifigIdRebrickable);

      // If not expired, get current price data and add trend info
      if (!isExpired) {
        const currentPriceData = await MinifigPriceMetadata.findOne(
          { minifigIdRebrickable },
          { priceData: 1, _id: 0 }
        ).lean();

        if (currentPriceData?.priceData) {
          const trends = await this.calculatePriceTrends(
            minifigIdRebrickable,
            currentPriceData.priceData
          );
          return {
            ...priceDataHandler.formatPriceData(currentPriceData.priceData),
            trends,
          };
        }
      }

      // If expired or no data, fetch new price data
      let bricklinkId = minifigIdBricklink;

      // If we don't have a BrickLink ID, try to find it
      if (!bricklinkId && minifigName) {
        bricklinkId = await externalApiService.findBricklinkIdForMinifig(
          minifigIdRebrickable,
          minifigName
        );
      }

      if (!bricklinkId) {
        return {
          ...priceDataHandler.getDefaultPriceData(),
          trends: this.getDefaultTrends(),
        };
      }

      // Fetch new price data
      const newPriceData = await externalApiService.fetchMinifigPriceData(
        bricklinkId
      );

      if (!newPriceData) {
        return {
          ...priceDataHandler.getDefaultPriceData(),
          trends: this.getDefaultTrends(),
        };
      }

      // Save current price data to history before updating
      await this.archiveCurrentPriceData(minifigIdRebrickable);

      // Update price data
      await MinifigPriceMetadata.updateOne(
        { minifigIdRebrickable },
        {
          $set: {
            priceData: newPriceData,
            isExpired: false,
            expiresAt: new Date(Date.now() + config.cacheExpiry.price),
          },
        },
        { upsert: true }
      );

      // Calculate trends with the new data
      const trends = await this.calculatePriceTrends(
        minifigIdRebrickable,
        newPriceData
      );

      return {
        ...priceDataHandler.formatPriceData(newPriceData),
        trends,
      };
    } catch (error) {
      console.error(
        `Error getting latest price data for ${minifig.minifigIdRebrickable}:`,
        error
      );
      return {
        ...priceDataHandler.getDefaultPriceData(),
        trends: this.getDefaultTrends(),
      };
    }
  }

  /**
   * Archive current price data to history collection
   *
   * @param {string} minifigIdRebrickable - Rebrickable ID of the minifig
   * @returns {Promise<boolean>} Success status
   */
  async archiveCurrentPriceData(minifigIdRebrickable) {
    try {
      await dbConnect();

      // Get current price data
      const existingPrice = await MinifigPriceMetadata.findOne(
        { minifigIdRebrickable },
        { _id: 0, priceData: 1, createdAt: 1 }
      ).lean();

      if (!existingPrice?.priceData) return false;

      // Check if we already have a recent history entry
      const recentHistory = await MinifigPriceHistory.findOne(
        { minifigIdRebrickable },
        { createdAt: 1 }
      )
        .sort({ createdAt: -1 })
        .lean();

      // If we have a recent history entry, check if it's too recent
      if (recentHistory) {
        const now = new Date();
        // Use 1/2 of the price cache expiry time as minimum time between history entries
        const minTimeBetweenHistoryEntries = Math.floor(
          config.cacheExpiry.price / 2
        );
        const timeSinceLastEntry = now - new Date(recentHistory.createdAt);

        // If the last history entry is too recent, don't create a new one
        if (timeSinceLastEntry < minTimeBetweenHistoryEntries) {
          console.log(
            `Skipping history entry for ${minifigIdRebrickable} - last entry too recent (${Math.round(
              timeSinceLastEntry / (60 * 60 * 1000)
            )} hours ago)`
          );
          return false;
        }
      }

      // Save to history with extended expiration
      await MinifigPriceHistory.create({
        minifigIdRebrickable,
        priceData: existingPrice.priceData,
        // Store history for 5x the price cache expiry time
        expiresAt: new Date(Date.now() + config.cacheExpiry.price * 5),
      });

      // Mark current as expired
      await MinifigPriceMetadata.updateOne(
        { minifigIdRebrickable },
        { $set: { isExpired: true } }
      );

      console.log(`Archived price data for ${minifigIdRebrickable} to history`);
      return true;
    } catch (error) {
      console.error(
        `Error archiving price data for ${minifigIdRebrickable}:`,
        error
      );
      return false;
    }
  }

  /**
   * Calculate price trends by comparing current prices with historical data
   *
   * @param {string} minifigIdRebrickable - Rebrickable ID of the minifig
   * @param {Object} currentPriceData - Current price data
   * @returns {Promise<Object>} Trend information
   */
  async calculatePriceTrends(minifigIdRebrickable, currentPriceData) {
    try {
      await dbConnect();

      // Get most recent historical price data
      const historicalPrice = await MinifigPriceHistory.findOne(
        { minifigIdRebrickable },
        { priceData: 1, createdAt: 1 }
      )
        .sort({ createdAt: -1 })
        .lean();

      if (!historicalPrice?.priceData) {
        return this.getDefaultTrends();
      }

      // Calculate trends for each price point
      const calculateTrend = (current, previous) => {
        if (current === null || previous === null)
          return { direction: "none", percentage: 0 };

        const diff = current - previous;
        if (diff === 0) return { direction: "none", percentage: 0 };

        const percentage = previous > 0 ? (diff / previous) * 100 : 0;
        return {
          direction: diff > 0 ? "up" : "down",
          percentage: Math.abs(parseFloat(percentage.toFixed(1))),
        };
      };

      return {
        avgPriceNew: calculateTrend(
          priceDataHandler.formatPriceData(currentPriceData).avgPriceNew,
          priceDataHandler.formatPriceData(historicalPrice.priceData)
            .avgPriceNew
        ),
        minPriceNew: calculateTrend(
          priceDataHandler.formatPriceData(currentPriceData).minPriceNew,
          priceDataHandler.formatPriceData(historicalPrice.priceData)
            .minPriceNew
        ),
        maxPriceNew: calculateTrend(
          priceDataHandler.formatPriceData(currentPriceData).maxPriceNew,
          priceDataHandler.formatPriceData(historicalPrice.priceData)
            .maxPriceNew
        ),
        avgPriceUsed: calculateTrend(
          priceDataHandler.formatPriceData(currentPriceData).avgPriceUsed,
          priceDataHandler.formatPriceData(historicalPrice.priceData)
            .avgPriceUsed
        ),
        minPriceUsed: calculateTrend(
          priceDataHandler.formatPriceData(currentPriceData).minPriceUsed,
          priceDataHandler.formatPriceData(historicalPrice.priceData)
            .minPriceUsed
        ),
        maxPriceUsed: calculateTrend(
          priceDataHandler.formatPriceData(currentPriceData).maxPriceUsed,
          priceDataHandler.formatPriceData(historicalPrice.priceData)
            .maxPriceUsed
        ),
        lastUpdated: historicalPrice.createdAt,
      };
    } catch (error) {
      console.error(
        `Error calculating price trends for ${minifigIdRebrickable}:`,
        error
      );
      return this.getDefaultTrends();
    }
  }

  /**
   * Get default trend data structure
   *
   * @returns {Object} Default trend data
   */
  getDefaultTrends() {
    const defaultTrend = { direction: "none", percentage: 0 };
    return {
      avgPriceNew: defaultTrend,
      minPriceNew: defaultTrend,
      maxPriceNew: defaultTrend,
      avgPriceUsed: defaultTrend,
      minPriceUsed: defaultTrend,
      maxPriceUsed: defaultTrend,
      lastUpdated: null,
    };
  }

  /**
   * Process price history for multiple minifigs in batches
   *
   * @param {Array} minifigs - Array of minifig objects
   * @param {number} batchSize - Size of each batch
   * @param {number} delayMs - Delay between batches in milliseconds
   * @returns {Promise<Array>} Array of minifigs with price data and trends
   */
  async batchProcessMinifigPriceHistory(
    minifigs,
    batchSize = 5,
    delayMs = 2000
  ) {
    const results = [];

    for (let i = 0; i < minifigs.length; i += batchSize) {
      const batch = minifigs.slice(i, i + batchSize);
      console.log(
        `Processing price history batch ${i / batchSize + 1}/${Math.ceil(
          minifigs.length / batchSize
        )}`
      );

      // Process this batch
      const batchPromises = batch.map(async (minifig) => {
        try {
          const priceDataWithTrends = await this.getLatestPriceData(minifig);
          return {
            ...minifig,
            priceData: priceDataWithTrends,
          };
        } catch (error) {
          console.error(
            `Error processing price history for minifig ${minifig.minifigIdRebrickable}:`,
            error
          );
          return {
            ...minifig,
            priceData: {
              ...priceDataHandler.getDefaultPriceData(),
              trends: this.getDefaultTrends(),
            },
          };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches
      if (i + batchSize < minifigs.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}

// Export a singleton instance
const priceHistoryService = new PriceHistoryService();
export default priceHistoryService;
