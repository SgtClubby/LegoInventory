// src/app/lib/API/Controllers/v1/BricklinkController.js

import BaseController from "../BaseController";
import dbConnect from "@/lib/Mongo/Mongo";
import externalApiService from "@/lib/API/ExternalApiService";
import cacheManager from "@/lib/Cache/CacheManager";

/**
 * Controller for BrickLink API interactions
 */
class BricklinkController extends BaseController {
  constructor() {
    super("BricklinkController");

    // Default User-Agent for external requests
    this.USER_AGENT =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";
  }

  /**
   * Normalize a string for comparison
   *
   * @param {string} str - String to normalize
   * @returns {string} Normalized string
   */
  normalizeString(str) {
    return str
      .trim()
      .toLowerCase()
      .replace(/\s*-\s*/g, "-")
      .replace(/[^a-z0-9-\s]/g, "")
      .replace(/\s+/g, " ");
  }

  /**
   * Strip currency symbols from a string
   *
   * @param {string} str - String with currency symbols
   * @returns {number} Numeric value
   */
  stripCurrency(str) {
    if (!str) return null;
    const clean = str.replace(/[^0-9.-]+/g, "");
    const value = parseFloat(clean);
    return isNaN(value) ? null : value;
  }

  /**
   * Calculate the average of min and max prices
   *
   * @param {string} min - Min price string
   * @param {string} max - Max price string
   * @returns {number|null} Average price or null
   */
  averageOfMinMax(min, max) {
    const minValue = this.stripCurrency(min);
    const maxValue = this.stripCurrency(max);

    if (minValue === null || maxValue === null) {
      return null;
    }

    const avg = (minValue + maxValue) / 2;
    return parseFloat(avg.toFixed(2));
  }

  /**
   * Fetch minifig price data from BrickLink
   *
   * @param {Request} req - The request object
   * @returns {Response} JSON response with pricing data
   */
  async post(req) {
    try {
      await dbConnect();
      const body = await req.json();

      if (!body) {
        return this.errorResponse("No body provided", 400);
      }

      const { minifigIdRebrickable, minifigName, minifigImage } = body;

      // Validate required parameters
      if (!minifigIdRebrickable || !minifigName) {
        return this.errorResponse(
          "Missing minifigIdRebrickable or minifigName",
          400
        );
      }

      // Check if we already have this data cached
      const existingMinifigCache = await cacheManager.getMinifigMetadata(
        minifigIdRebrickable
      );

      if (
        existingMinifigCache?.priceData &&
        existingMinifigCache.minifigIdBricklink
      ) {
        console.log(
          `[Bricklink Price Data] CACHE HIT! Cache hit for ${minifigIdRebrickable}:`
        );

        // Format the price data for response
        const formattedPriceData = existingMinifigCache
          ? this.formatPriceData(existingMinifigCache.priceData)
          : this.getDefaultPriceData();

        const cacheResult = {
          minifigIdBricklink: existingMinifigCache.minifigIdBricklink,
          minifigName: existingMinifigCache.minifigName,
          priceData: formattedPriceData,
        };

        return this.successResponse(cacheResult);
      }

      // If we don't have cached data, fetch from Rebrickable API
      const bricklinkMinifigId = await this.findBricklinkId(
        minifigIdRebrickable,
        minifigName
      );

      if (!bricklinkMinifigId) {
        return this.errorResponse("Minifig not found in set inventory", 404);
      }

      // Fetch minifig price data from BrickLink
      const priceData = await this.fetchBricklinkData(bricklinkMinifigId);

      if (priceData.error) {
        return this.errorResponse(priceData.error, priceData.status || 500);
      }

      // Structure the result
      const result = {
        minifigIdBricklink: bricklinkMinifigId,
        minifigName: priceData.minifigName || minifigName,
        priceData: priceData.priceData,
      };

      // Update cache
      cacheManager.setMinifigMetadata(
        {
          minifigIdRebrickable,
          minifigIdBricklink: result.minifigIdBricklink,
          minifigImage,
          minifigName: result.minifigName,
        },
        result.priceData
      );

      return this.successResponse(result);
    } catch (error) {
      console.error("Error fetching BrickLink data:", error);
      return this.errorResponse("Internal server error", 500);
    }
  }

  /**
   * Process batch price updates for multiple minifigs
   *
   * @param {Request} req - The request object
   * @returns {Response} JSON response with processing status
   */
  async processPrice(req) {
    try {
      await dbConnect();
      const body = await req.json();

      if (!body || !Array.isArray(body) || body.length === 0) {
        return this.errorResponse(
          "Invalid input: expected array of minifigs",
          400
        );
      }

      // For batch processing, return immediately with acknowledgment
      // Processing will happen in the background
      const batchId = Date.now().toString(36);

      // Start background processing without awaiting result
      this.processBatchesInBackground(body, batchId);

      return this.successResponse({
        message: "Processing started",
        batchId,
        count: body.length,
      });
    } catch (error) {
      console.error("Error processing minifig prices:", error);
      return this.errorResponse("Internal server error", 500);
    }
  }

  /**
   * Process minifigs in batches in the background
   *
   * @param {Array} items - Array of minifig objects to process
   * @param {string} batchId - Unique identifier for this batch process
   */
  async processBatchesInBackground(items, batchId) {
    try {
      const BATCH_SIZE = 5;
      const STANDARD_DELAY = 3000; // 3 seconds between normal batches
      const RATE_LIMIT_DELAY = 60000; // 1 minute when rate limited
      let batchDelay = STANDARD_DELAY;
      const totalBatches = Math.ceil(items.length / BATCH_SIZE);
      let wasRateLimited = false;
      let processedCount = 0;
      let errorCount = 0;

      console.log(
        `[Batch ${batchId}] Starting to process ${items.length} minifigs in ${totalBatches} batches`
      );

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
        const batch = items.slice(i, i + BATCH_SIZE);

        console.log(
          `[Batch ${batchId}] Processing batch ${batchNumber}/${totalBatches} (${batch.length} minifigs)`
        );

        for (const item of batch) {
          try {
            const { minifigIdRebrickable, minifigIdBricklink } = item;

            // Check if we already have price data in the database
            const existingData = await cacheManager.getMinifigMetadata(
              minifigIdRebrickable
            );

            if (existingData && existingData.priceData) {
              console.log(
                `[Batch ${batchId}] Using cached price data for ${minifigIdRebrickable}`
              );
              processedCount++;
              continue; // Skip to next item
            }

            // Process this minifig
            let bricklinkId = minifigIdBricklink;

            if (!bricklinkId) {
              // Look up the BrickLink ID if not provided
              bricklinkId = await this.findBricklinkId(minifigIdRebrickable);

              if (!bricklinkId) {
                console.warn(
                  `[Batch ${batchId}] Minifig not found for ${minifigIdRebrickable}`
                );
                errorCount++;
                continue; // Skip to next item
              }
            }

            const result = await this.fetchBricklinkData(bricklinkId);

            // Handle rate limiting
            if (result.rateLimited) {
              console.warn(`[Batch ${batchId}] Rate limited during processing`);
              wasRateLimited = true;
              break; // Break out of the current batch
            }

            if (result.error) {
              console.error(
                `[Batch ${batchId}] Error for ${minifigIdRebrickable}: ${result.error}`
              );
              errorCount++;
              continue;
            }

            // Store result in database
            await cacheManager.setMinifigMetadata(
              {
                minifigIdRebrickable,
                minifigIdBricklink: result.minifigIdBricklink,
                minifigName: item.minifigName,
                minifigImage: item.minifigImage,
              },
              result.priceData
            );

            processedCount++;
          } catch (itemError) {
            console.error(
              `[Batch ${batchId}] Error processing item:`,
              itemError
            );
            errorCount++;
          }
        }

        // Add delay between batches if not the last batch
        if (i + BATCH_SIZE < items.length) {
          const currentDelay = wasRateLimited ? RATE_LIMIT_DELAY : batchDelay;
          console.log(
            `[Batch ${batchId}] Waiting ${
              currentDelay / 1000
            }s before next batch...`
          );
          await new Promise((resolve) => setTimeout(resolve, currentDelay));

          // Reset rate limit flag after waiting
          wasRateLimited = false;
        }
      }

      console.log(
        `[Batch ${batchId}] Completed processing. Success: ${processedCount}, Errors: ${errorCount}`
      );
    } catch (error) {
      console.error(
        `[Batch ${batchId}] Fatal error in background processing:`,
        error
      );
    }
  }

  /**
   * Find Bricklink ID for a minifig
   *
   * @param {string} minifigIdRebrickable - Rebrickable minifig ID
   * @param {string} minifigName - Optional minifig name to help with matching
   * @returns {Promise<string|null>} BrickLink ID or null if not found
   */
  async findBricklinkId(minifigIdRebrickable, minifigName = null) {
    try {
      // First check if we already have cached the BrickLink ID in the metadata
      const existingMetadata = await cacheManager.getMinifigMetadata(
        minifigIdRebrickable
      );

      if (existingMetadata?.minifigIdBricklink) {
        console.log(
          `Using cached BrickLink ID for ${minifigIdRebrickable}: ${existingMetadata.minifigIdBricklink}`
        );
        return existingMetadata.minifigIdBricklink;
      }

      return await externalApiService.findBricklinkIdForMinifig(
        minifigIdRebrickable,
        minifigName
      );
    } catch (error) {
      console.error(
        `Error finding BrickLink ID for ${minifigIdRebrickable}:`,
        error
      );
      return null;
    }
  }

  /**
   * Fetch minifig data from BrickLink
   *
   * @param {string} bricklinkMinifigId - BrickLink minifig ID
   * @returns {Promise<Object>} Minifig data or error
   */
  async fetchBricklinkData(bricklinkMinifigId) {
    try {
      // Try to use the external API service first
      const priceData = await externalApiService.fetchMinifigPriceData(
        bricklinkMinifigId
      );

      if (priceData) {
        return {
          minifigName: null, // We don't get the name from the price data
          priceData: priceData,
        };
      }

      // Fallback: Fetch minifig data from BrickLink directly
      const searchUrl = `https://www.bricklink.com/ajax/clone/search/searchproduct.ajax?q=${encodeURIComponent(
        bricklinkMinifigId
      )}&st=0&cond=&type=M&cat=&yf=0&yt=0&loc=&reg=0&ca=0&ss=&pmt=&nmp=0&color=-1&min=0&max=0&minqty=0&nosuperlot=1&incomplete=0&showempty=1&rpp=25&pi=1&ci=0`;

      const res = await fetch(searchUrl, {
        headers: {
          "User-Agent": this.USER_AGENT,
        },
      });

      if (res.status === 429) {
        console.log("Rate limited by BrickLink!");
        return { rateLimited: true, error: "Rate limited", status: 429 };
      }

      if (!res.ok) {
        console.log("Fetch NOT OK!");
        return { error: "Failed to fetch BrickLink Data", status: res.status };
      }

      const data = await res.json();
      const bricklinkData = data.result.typeList[0]?.items[0];

      if (!bricklinkData) {
        console.log("No BrickLink data found");
        return { error: "No data found", status: 404 };
      }

      // Parse and format price data
      const rawAvgNew = this.averageOfMinMax(
        bricklinkData.mNewMinPrice,
        bricklinkData.mNewMaxPrice
      );
      const avgPriceNew =
        rawAvgNew === null ? null : parseFloat(rawAvgNew.toFixed(2));

      const rawAvgUsed = this.averageOfMinMax(
        bricklinkData.mUsedMinPrice,
        bricklinkData.mUsedMaxPrice
      );
      const avgPriceUsed =
        rawAvgUsed === null ? null : parseFloat(rawAvgUsed.toFixed(2));

      // Return structured result
      return {
        minifigName: bricklinkData.strItemName,
        priceData: {
          currencyCode: "USD",
          currencySymbol: "$",
          minPriceNew: this.stripCurrency(bricklinkData.mNewMinPrice),
          maxPriceNew: this.stripCurrency(bricklinkData.mNewMaxPrice),
          avgPriceNew,
          minPriceUsed: this.stripCurrency(bricklinkData.mUsedMinPrice),
          maxPriceUsed: this.stripCurrency(bricklinkData.mUsedMaxPrice),
          avgPriceUsed,
        },
      };
    } catch (error) {
      console.error("Error in fetchBricklinkData:", error);
      return { error: "Failed to fetch BrickLink data: " + error.message };
    }
  }

  /**
   * Format price data to ensure consistent structure
   *
   * @param {Object} priceData - Raw price data
   * @returns {Object} Formatted price data
   */
  formatPriceData(priceData) {
    if (!priceData) return this.getDefaultPriceData();

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
}

export default new BricklinkController();
