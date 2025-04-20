// src/app/api/bricklink/price/route.js

import { MinifigMetadata, MinifigPriceMetadata } from "@/lib/Mongo/Schema";
import { load } from "cheerio";
import { findBestMatch } from "string-similarity";

/**
 * Default User-Agent header to use for external requests
 */
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";

/**
 * Configuration for batch processing
 */
const BATCH_CONFIG = {
  BATCH_SIZE: 5,
  STANDARD_DELAY: 3000, // 3 seconds between normal batches
  RATE_LIMIT_DELAY: 60000, // 1 minute when rate limited
};

/**
 * Normalizes a string by trimming, lowercasing, and removing special characters
 *
 * @param {string} str - The string to normalize
 * @returns {string} Normalized string
 */
function normalize(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s*-\s*/g, "-")
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Strips currency symbols from a string and converts to a float
 *
 * @param {string} str - String with currency formatting
 * @returns {number} Parsed float value
 */
function stripCurrency(str) {
  const clean = str.replace(/[^0-9.-]+/g, "");
  return parseFloat(clean);
}

/**
 * Calculates the average of min and max price values
 *
 * @param {string} min - Minimum price with currency symbol
 * @param {string} max - Maximum price with currency symbol
 * @returns {number} Average of the two prices
 */
function averageOfMinMax(min, max) {
  const a = stripCurrency(min);
  const b = stripCurrency(max);
  return Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : null;
}

/**
 * Creates a JSON response with appropriate status
 *
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response} JSON response object
 */
function jsonResponse(data, status = 200) {
  return Response.json(data, { status });
}

/**
 * Creates an error response with given message and status
 *
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response} JSON error response
 */
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

/**
 * Fetches a URL with timeout protection
 *
 * @param {string} url - URL to fetch
 * @param {RequestInit} [opts={}] - Fetch options
 * @param {number} [ms=5000] - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */
async function fetchWithTimeout(url, opts = {}, ms = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Handles POST requests to fetch Bricklink data for minifigs
 * Supports both single and batch requests, optimized for background processing
 *
 * @param {Request} request - NextJS request object
 * @returns {Response} JSON response with minifig data or early acknowledgment for batches
 */
export async function POST(request) {
  try {
    const body = await request.json();

    if (!body) {
      return errorResponse("No body provided", 400);
    }

    // Determine if this is a single request or batch request
    const isMultifetch = Array.isArray(body);

    if (isMultifetch) {
      // Handle multi-fetch request
      if (body.length === 0) {
        return errorResponse("Empty array provided", 400);
      }

      // Validate each item in the batch
      for (const item of body) {
        if (!item.minifigIdRebrickable) {
          return errorResponse(
            "Missing minifigIdRebrickable in one or more items",
            400
          );
        }
      }

      // For batches, return immediately with acknowledgment and process in background
      // This improves UI responsiveness
      const batchId = Date.now().toString(36);
      console.log(
        `Starting background processing for batch ${batchId} with ${body.length} minifigs`
      );

      // Start background processing without awaiting result
      processBatchesInBackground(body, batchId);

      // Return acknowledgment immediately
      return jsonResponse({
        message: "Processing started",
        batchId,
        count: body.length,
      });
    } else {
      // For single requests, process normally and return the result
      const { minifigIdRebrickable, minifigIdBricklink } = body;

      if (!minifigIdRebrickable) {
        return errorResponse("Missing minifigIdRebrickable", 400);
      }

      let result;

      if (minifigIdBricklink) {
        // If minifigIdBricklink is provided, fetch data from BrickLink directly
        result = await fetchBricklinkData(minifigIdBricklink);
      } else {
        // Otherwise, need to first find the BrickLink ID
        const bricklinkMinifigId = await fetchBricklinkId(minifigIdRebrickable);

        if (!bricklinkMinifigId) {
          return errorResponse("Minifig not found in set inventory", 404);
        }

        result = await fetchBricklinkData(bricklinkMinifigId);
      }

      if (result.error) {
        return errorResponse(result.error, result.status || 500);
      }

      // Structure the response
      const response = {
        id: minifigIdRebrickable,
        priceData: result.priceData,
      };

      // Save the price data to the database
      try {
        await MinifigPriceMetadata.updateOne(
          { minifigIdRebrickable },
          { $set: { priceData: result.priceData } },
          { upsert: true }
        );
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Continue - we'll return the data even if saving fails
      }

      return jsonResponse(response);
    }
  } catch (error) {
    console.error("Error fetching BrickLink minifig prices:", error);
    return errorResponse("Internal server error", 500);
  }
}

/**
 * Process minifigs in batches in the background without blocking the response
 *
 * @param {Array} items - Array of minifig objects to process
 * @param {string} batchId - Unique identifier for this batch process
 */
async function processBatchesInBackground(items, batchId) {
  try {
    const { BATCH_SIZE, STANDARD_DELAY, RATE_LIMIT_DELAY } = BATCH_CONFIG;
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
          const existingData = await MinifigPriceMetadata.findOne(
            { minifigIdRebrickable },
            { _id: 0, priceData: 1 }
          ).lean();

          if (
            existingData &&
            Object.keys(existingData.priceData || {}).length > 0
          ) {
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
            bricklinkId = await fetchBricklinkId(minifigIdRebrickable);

            if (!bricklinkId) {
              console.warn(
                `[Batch ${batchId}] Minifig not found for ${minifigIdRebrickable}`
              );
              errorCount++;
              continue; // Skip to next item
            }
          }

          const result = await fetchBricklinkData(bricklinkId);

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
          await MinifigPriceMetadata.updateOne(
            { minifigIdRebrickable },
            { $set: { priceData: result.priceData } },
            { upsert: true }
          );

          processedCount++;
        } catch (itemError) {
          console.error(`[Batch ${batchId}] Error processing item:`, itemError);
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
 * Fetches minifig data from BrickLink
 *
 * @param {string} bricklinkMinifigId - BrickLink minifig ID
 * @returns {Promise<Object>} Minifig price data or error
 */
async function fetchBricklinkData(bricklinkMinifigId) {
  try {
    // Fetch minifig data from BrickLink
    const searchUrl = `https://www.bricklink.com/ajax/clone/search/searchproduct.ajax?q=${encodeURIComponent(
      bricklinkMinifigId
    )}&st=0&cond=&type=M&cat=&yf=0&yt=0&loc=&reg=0&ca=0&ss=&pmt=&nmp=0&color=-1&min=0&max=0&minqty=0&nosuperlot=1&incomplete=0&showempty=1&rpp=25&pi=1&ci=0`;

    const res = await fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
    });

    if (res.status === 429) {
      console.log("Rate limited by BrickLink!");
      return { rateLimited: true, error: "Rate limited" };
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

    // Parse and format the new price data
    const rawAvgNew = averageOfMinMax(
      bricklinkData.mNewMinPrice,
      bricklinkData.mNewMaxPrice
    );
    const avgPriceNew =
      rawAvgNew === null ? null : parseFloat(rawAvgNew.toFixed(2));

    // Parse and format the used price data
    const rawAvgUsed = averageOfMinMax(
      bricklinkData.mUsedMinPrice,
      bricklinkData.mUsedMaxPrice
    );
    const avgPriceUsed =
      rawAvgUsed === null ? null : parseFloat(rawAvgUsed.toFixed(2));

    // Structure the result
    const result = {
      priceData: {
        currencyCode: "USD",
        currencySymbol: "$",
        minPriceNew: stripCurrency(bricklinkData.mNewMinPrice),
        maxPriceNew: stripCurrency(bricklinkData.mNewMaxPrice),
        avgPriceNew,
        minPriceUsed: stripCurrency(bricklinkData.mUsedMinPrice),
        maxPriceUsed: stripCurrency(bricklinkData.mUsedMaxPrice),
        avgPriceUsed,
      },
    };

    return result;
  } catch (error) {
    console.error("Error in fetchBricklinkData:", error);
    return { error: "Failed to fetch BrickLink data: " + error.message };
  }
}

/**
 * Fetches the BrickLink ID for a Rebrickable minifig ID
 *
 * @param {string} minifigIdRebrickable - Rebrickable minifig ID
 * @returns {Promise<string|null>} BrickLink minifig ID or null if not found
 */
async function fetchBricklinkId(minifigIdRebrickable) {
  try {
    // First check if we have already cached the BrickLink ID in the metadata
    const existingMetadata = await MinifigMetadata.findOne(
      {
        minifigIdRebrickable,
        minifigIdBricklink: { $exists: true, $ne: null },
      },
      { minifigIdBricklink: 1, _id: 0 }
    ).lean();

    if (existingMetadata?.minifigIdBricklink) {
      console.log(
        `Using cached BrickLink ID for ${minifigIdRebrickable}: ${existingMetadata.minifigIdBricklink}`
      );
      return existingMetadata.minifigIdBricklink;
    }

    // Fetch sets from Rebrickable API
    const setsRes = await fetch(
      `https://rebrickable.com/api/v3/lego/minifigs/${minifigIdRebrickable}/sets/`,
      {
        headers: {
          Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
          "User-Agent":
            "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
        },
      }
    );

    if (!setsRes.ok) {
      console.error(`Failed to fetch Rebrickable data: ${setsRes.status}`);
      return null;
    }

    const { results } = await setsRes.json();
    if (!results || results.length === 0) {
      console.error("No sets found containing this minifig");
      return null;
    }

    // Find the appropriate set containing this minifig
    function numericPart(s) {
      const [prefix] = s.split("-");
      return /^\d+$/.test(prefix) ? Number(prefix) : NaN;
    }

    const validSets = results.filter(
      (r) => !Number.isNaN(numericPart(r.set_num))
    );
    if (!validSets.length) {
      console.error("No numeric set numbers found");
      return null;
    }

    const lowestValid = validSets.reduce((p, c) =>
      numericPart(c.set_num) < numericPart(p.set_num) ? c : p
    );

    const setNumber = lowestValid.set_num;

    if (!setNumber) {
      console.error("No valid set found for this minifig");
      return null;
    }

    // Fetch set inventory from BrickLink
    const bricklinkUrl = `https://www.bricklink.com/catalogItemInv.asp?S=${encodeURIComponent(
      setNumber
    )}&viewItemType=M`;

    const blRes = await fetchWithTimeout(bricklinkUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
    });

    if (!blRes.ok) {
      console.error(`Failed to fetch BrickLink data: ${blRes.status}`);
      return null;
    }

    const html = await blRes.text();

    // Parse HTML to extract minifig IDs
    const $ = load(html);
    const rows = [];

    $("table.ta tr.IV_ITEM").each((_, tr) => {
      const bold = $(tr).find("td").eq(3).find("b").text() || "";
      if (!bold) {
        return;
      }
      rows.push({
        toFind: normalize(bold),
        id: $(tr).find("td").eq(2).find("a").first().text().trim(),
      });
    });

    const existingData = await MinifigMetadata.findOne(
      {
        minifigIdRebrickable: minifigIdRebrickable,
      },
      {
        _id: 0,
        minifigName: 1,
      }
    ).lean();

    if (!existingData || !existingData.minifigName) {
      console.error(`No minifig name found for ${minifigIdRebrickable}`);
      return null;
    }

    // Find best match for the minifig name
    const search = normalize(existingData.minifigName.replace(/\+/g, " "));
    const toFind = rows.map((r) => r.toFind);

    if (toFind.length === 0) {
      console.error("No minifigs found in this set");
      return null;
    }

    const { bestMatchIndex } = findBestMatch(search, toFind);
    const bricklinkMinifigId = rows[bestMatchIndex].id;

    // Save the Bricklink ID for future use
    try {
      await MinifigMetadata.updateOne(
        { minifigIdRebrickable },
        { $set: { minifigIdBricklink: bricklinkMinifigId } }
      );
    } catch (error) {
      console.error(
        `Error saving BrickLink ID for ${minifigIdRebrickable}:`,
        error
      );
      // Continue - we'll return the ID even if saving fails
    }

    return bricklinkMinifigId;
  } catch (error) {
    console.error(
      `Error in fetchBricklinkId for ${minifigIdRebrickable}:`,
      error
    );
    return null;
  }
}
