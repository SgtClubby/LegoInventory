// src/app/api/set/postProcessColor/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { Brick, ColorCache } from "@/lib/Mongo/Schema";

/**
 * Processes LEGO piece IDs to fetch and store their available colors
 *
 * @param {Request} req - The request object containing pieceIds, tableId, and ownerId
 * @returns {Response} JSON response indicating success or failure
 */
export async function POST(req) {
  try {
    await dbConnect();
    const { pieceIds, tableId, ownerId } = await req.json();

    if (!pieceIds?.length || !tableId || !ownerId) {
      return Response.json(
        {
          success: false,
          error: "Missing required parameters",
        },
        { status: 400 }
      );
    }

    console.log(`Starting color processing for ${pieceIds.length} pieces...`);
    await processPiecesInBatches(pieceIds, tableId, ownerId);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error in postProcessColor:", error);
    return Response.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Process pieces in batches to avoid overwhelming the API or database
 *
 * @param {string[]} pieceIds - Array of piece IDs to process
 * @param {string} tableId - Table ID for the database query
 * @param {string} ownerId - Owner ID for the database query
 */
async function processPiecesInBatches(pieceIds, tableId, ownerId) {
  const BATCH_SIZE = 5;
  const STANDARD_DELAY = 6000; // 5 seconds between normal batches
  const RATE_LIMIT_DELAY = 120000; // 2 minutes when rate limited

  let batchDelay = STANDARD_DELAY;
  let totalBatches = Math.ceil(pieceIds.length / BATCH_SIZE);

  // Track processed pieces to avoid duplicates
  const processedPieceIds = new Set();

  for (let i = 0; i < pieceIds.length; i += BATCH_SIZE) {
    const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
    const batch = pieceIds.slice(i, i + BATCH_SIZE);

    // Filter out any pieces we've already processed
    const unprocessedBatch = batch.filter((id) => !processedPieceIds.has(id));

    if (unprocessedBatch.length === 0) {
      console.log(
        `Batch ${batchNumber}: All pieces already processed, skipping.`
      );
      continue;
    }

    console.log(
      `Processing batch ${batchNumber} of ${totalBatches} (${unprocessedBatch.length} pieces)...`
    );

    try {
      // First check cache for pieces in this specific batch only
      const cachedResults = await getColorCache(unprocessedBatch);

      // Split into cached and uncached pieces
      const cachedPieceIds = cachedResults.map((item) => item.elementId);
      const uncachedPieceIds = unprocessedBatch.filter(
        (id) => !cachedPieceIds.includes(id)
      );

      // Update database with cached results
      if (cachedResults.length > 0) {
        await updateBricksWithCachedColors(cachedResults, tableId, ownerId);
        console.log(
          `Found ${cachedResults.length} pieces in cache of ${unprocessedBatch.length} in batch`
        );

        // Mark cached pieces as processed
        cachedPieceIds.forEach((id) => processedPieceIds.add(id));
      }

      // Fetch uncached pieces from API
      if (uncachedPieceIds.length > 0) {
        console.log(`Fetching ${uncachedPieceIds.length} pieces from API`);
        const fetchResult = await fetchColorsForPieces(
          uncachedPieceIds,
          tableId,
          ownerId
        );

        // Mark fetched pieces as processed
        uncachedPieceIds.forEach((id) => processedPieceIds.add(id));

        // If we hit rate limits, increase delay for next batch
        if (fetchResult.rateLimited) {
          console.log(`Rate limit detected. Increasing delay for next batch.`);
          batchDelay = RATE_LIMIT_DELAY;
        } else {
          batchDelay = STANDARD_DELAY;
        }
      }
    } catch (error) {
      console.error(`Error processing batch ${batchNumber}:`, error);
    }

    // Add delay between batches if not the last batch
    if (i + BATCH_SIZE < pieceIds.length) {
      console.log(`Waiting ${batchDelay / 1000} seconds before next batch...`);
      await new Promise((resolve) => setTimeout(resolve, batchDelay));
    }
  }

  console.log(
    `All batches processed successfully. Processed ${processedPieceIds.size} unique pieces.`
  );
}

/**
 * Retrieve color cache entries for the given piece IDs
 *
 * @param {string[]} pieceIds - Array of piece IDs to look up in cache
 * @returns {Array} - Array of cache entries with color information
 */
async function getColorCache(pieceIds) {
  try {
    const cacheEntries = await ColorCache.find(
      { elementId: { $in: pieceIds } },
      { elementId: 1, availableColors: 1, _id: 0 }
    );

    if (cacheEntries.length > 0) {
      console.log(
        `Cache hit for ${cacheEntries.length} of ${pieceIds.length} pieces`
      );
    }

    return cacheEntries;
  } catch (error) {
    console.error("Error retrieving from color cache:", error);
    return [];
  }
}

/**
 * Update bricks in database with cached color information
 *
 * @param {Array} cachedResults - Array of cached color entries
 * @param {string} tableId - Table ID for the database query
 * @param {string} ownerId - Owner ID for the database query
 */
async function updateBricksWithCachedColors(cachedResults, tableId, ownerId) {
  try {
    const updateOperations = cachedResults.map((cache) => ({
      updateOne: {
        filter: { elementId: cache.elementId, tableId, ownerId },
        update: { $set: { availableColors: cache.availableColors } },
      },
    }));

    if (updateOperations.length > 0) {
      await Brick.bulkWrite(updateOperations);
      console.log(
        `Updated ${updateOperations.length} bricks with cached colors`
      );
    }
  } catch (error) {
    console.error("Error updating bricks with cached colors:", error);
  }
}

/**
 * Fetch colors for pieces from the Rebrickable API
 *
 * @param {string[]} pieceIds - Array of piece IDs to fetch colors for
 * @param {string} tableId - Table ID for the database query
 * @param {string} ownerId - Owner ID for the database query
 * @returns {Object} - Result object with rateLimited flag
 */
async function fetchColorsForPieces(pieceIds, tableId, ownerId) {
  const result = { rateLimited: false };

  // Create an array of promises for each API fetch
  const fetchPromises = pieceIds.map(async (pieceId) => {
    try {
      const response = await fetch(
        `https://rebrickable.com/api/v3/lego/parts/${pieceId}/colors`,
        {
          headers: {
            Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
            "User-Agent":
              "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
          },
        }
      );

      // Handle different response statuses
      if (response.status === 429) {
        console.warn(`Rate limit exceeded for piece ${pieceId}`);
        result.rateLimited = true;
        return null;
      }

      if (response.status === 404) {
        console.warn(`Piece ${pieceId} not found`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`Error fetching colors: ${response.statusText}`);
      }

      const data = await response.json();

      // Map the API response to our schema format
      const colorData = {
        elementId: pieceId,
        availableColors: data.results.map((result) => ({
          colorId: result.color_id,
          color: result.color_name,
        })),
      };

      // Save to cache and update brick
      await Promise.all([
        // Update the brick document
        Brick.updateOne(
          { elementId: pieceId, tableId, ownerId },
          { $set: { availableColors: colorData.availableColors } }
        ),

        // Save to cache (upsert to handle existing entries)
        ColorCache.updateOne(
          { elementId: pieceId },
          { $set: colorData },
          { upsert: true }
        ),
      ]);

      console.log(`Successfully processed piece ${pieceId}`);
      return colorData;
    } catch (error) {
      console.error(`Error fetching colors for piece ${pieceId}:`, error);
      return null;
    }
  });

  // Wait for all fetch operations to complete
  await Promise.all(fetchPromises);
  return result;
}
