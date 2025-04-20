// src/app/lib/Services/PriceDataHandler.js

import cacheManager from "@/lib/Cache/CacheManager";
import externalApiService from "@/lib/API/ExternalApiService";

/**
 * Handler for minifig price data operations
 */
class PriceDataHandler {
  /**
   * Fetch price data for a minifig
   *
   * @param {Object} minifig - Minifig data with IDs
   * @returns {Promise<Object>} Price data
   */
  async getMinifigPriceData(minifig) {
    try {
      const { minifigIdRebrickable, minifigIdBricklink, minifigName } = minifig;

      if (!minifigIdRebrickable) {
        return this.getDefaultPriceData();
      }

      // Check if we have cached price data
      const cachedData = await cacheManager.getMinifigMetadata(
        minifigIdRebrickable
      );
      if (cachedData?.priceData) {
        return this.formatPriceData(cachedData.priceData);
      }

      // If we have a Bricklink ID, use it directly
      let bricklinkId = minifigIdBricklink;

      // If not, try to find it
      if (!bricklinkId && minifigName) {
        bricklinkId = await externalApiService.findBricklinkIdForMinifig(
          minifigIdRebrickable,
          minifigName
        );
      }

      // If we have a Bricklink ID, fetch price data
      if (bricklinkId) {
        const priceData = await externalApiService.fetchMinifigPriceData(
          bricklinkId
        );

        if (priceData) {
          // Cache the price data
          if (cachedData) {
            await cacheManager.setMinifigMetadata(cachedData, priceData);
          } else {
            // If we don't have metadata, create a minimal entry
            await cacheManager.setMinifigMetadata(
              {
                minifigIdRebrickable,
                minifigIdBricklink: bricklinkId,
                minifigName: minifigName || `Minifig ${minifigIdRebrickable}`,
                minifigImage: minifig.minifigImage || "",
              },
              priceData
            );
          }

          return this.formatPriceData(priceData);
        }
      }

      // If all else fails, return default price data
      return this.getDefaultPriceData();
    } catch (error) {
      console.error("Error getting minifig price data:", error);
      return this.getDefaultPriceData();
    }
  }

  /**
   * Format price data to ensure consistent structure
   *
   * @param {Object} priceData - Raw price data
   * @returns {Object} Formatted price data
   */
  formatPriceData(priceData) {
    // Ensure all price fields are either numbers or null, never undefined
    const formatPrice = (value) => {
      if (value === undefined) return null;
      if (value === null) return null;

      // Handle Decimal128 objects from MongoDB
      if (value && typeof value.toString === "function") {
        return parseFloat(parseFloat(value.toString()).toFixed(2));
      }

      const num = parseFloat(value);
      return isNaN(num) ? null : parseFloat(num.toFixed(2));
    };

    return {
      minPriceNew: formatPrice(priceData.minPriceNew),
      maxPriceNew: formatPrice(priceData.maxPriceNew),
      avgPriceNew: formatPrice(priceData.avgPriceNew),
      minPriceUsed: formatPrice(priceData.minPriceUsed),
      maxPriceUsed: formatPrice(priceData.maxPriceUsed),
      avgPriceUsed: formatPrice(priceData.avgPriceUsed),
      currencyCode: priceData.currencyCode || "USD",
      currencySymbol: priceData.currencySymbol || "$",
    };
  }

  /**
   * Get default price data structure with null values
   *
   * @returns {Object} Default price data
   */
  getDefaultPriceData() {
    return {
      minPriceNew: null,
      maxPriceNew: null,
      avgPriceNew: null,
      minPriceUsed: null,
      maxPriceUsed: null,
      avgPriceUsed: null,
      currencyCode: "USD",
      currencySymbol: "$",
    };
  }

  /**
   * Process price data for multiple minifigs in batches
   *
   * @param {Array} minifigs - Array of minifig objects
   * @param {number} batchSize - Size of each batch
   * @param {number} delayMs - Delay between batches in milliseconds
   * @returns {Promise<Array>} Array of minifigs with price data
   */
  async batchProcessMinifigPrices(minifigs, batchSize = 5, delayMs = 2000) {
    const results = [];

    for (let i = 0; i < minifigs.length; i += batchSize) {
      const batch = minifigs.slice(i, i + batchSize);
      console.log(
        `Processing price data batch ${i / batchSize + 1}/${Math.ceil(
          minifigs.length / batchSize
        )}`
      );

      // Process this batch
      const batchPromises = batch.map(async (minifig) => {
        try {
          const priceData = await this.getMinifigPriceData(minifig);
          return {
            ...minifig,
            priceData,
          };
        } catch (error) {
          console.error(
            `Error processing price for minifig ${minifig.minifigIdRebrickable}:`,
            error
          );
          return {
            ...minifig,
            priceData: this.getDefaultPriceData(),
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
const priceDataHandler = new PriceDataHandler();
export default priceDataHandler;
