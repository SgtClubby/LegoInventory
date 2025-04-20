// src/app/api/set/postProcessColor/route.js

// This whole file could have been avoided if reBrickable had a better API for fetching bulk color data
// As of 15/04/2025, they do not support (as far as im aware) bulk fetching of color data for parts.
// Soo.. only option is to bruteforce one piece at a time in batched requests... Not what i want to do, it feels illegal...
// Buut, have yet to have major problems with this approach, but it could be that this one day gets me perma banned.
// Already been temp banned once during development of this post process step, not fun...
// perhaps add support for dynamic timing of this effectively, due to the response when you get throttled.

import dbConnect from "@/lib/Mongo/Mongo";
import { UserBrick, BrickMetadata } from "@/lib/Mongo/Schema";

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
  const STANDARD_DELAY = 6000; // 6 seconds between normal batches
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
      // First we double check if we have recieved any potentially cached results
      const cachedResults = await getColorCache(unprocessedBatch);

      console.log(
        `Found ${cachedResults.length} cached pieces in batch ${batchNumber}`
      );

      // Split into cached and uncached pieces
      const cachedPieceIds = cachedResults.map((item) => item.elementId);
      const uncachedPieceIds = unprocessedBatch.filter(
        (id) => !cachedPieceIds.includes(id)
      );

      // Update user bricks with cached results
      if (cachedResults.length > 0) {
        await updateMetadata(cachedResults);
        console.log(
          `Found ${cachedResults.length} pieces in cache of ${unprocessedBatch.length} in batch`
        );

        // Mark cached pieces as processed
        cachedPieceIds.forEach((id) => processedPieceIds.add(id));
      }

      // Fetch uncached pieces from API
      if (uncachedPieceIds.length > 0) {
        console.log(`Fetching ${uncachedPieceIds.length} pieces from API`);
        const { results, rateLimited } = await fetchColorsForPieces(
          uncachedPieceIds,
          tableId,
          ownerId
        );

        console.log(
          `Fetched ${results.length} pieces from API in batch ${batchNumber}`
        );

        // Mark fetched pieces as processed
        uncachedPieceIds.forEach((id) => processedPieceIds.add(id));

        // If we hit rate limits, increase delay for next batch
        if (rateLimited) {
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
    const cacheEntries = await BrickMetadata.find({
      elementId: { $in: pieceIds },
      invalid: false,
      cacheIncomplete: false,
    });

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
 * Update user bricks in database with cached color information
 *
 * @param {Array} cachedResults - Array of cached color entries
 */
async function updateMetadata(cachedResults) {
  try {
    const metadataOperations = cachedResults.map((cache) => ({
      updateOne: {
        filter: { elementId: cache.elementId },
        update: {
          $setOnInsert: { elementId: cache.elementId },
          $set: { availableColors: cache.availableColors },
        },
        upsert: true,
      },
    }));

    if (metadataOperations.length > 0) {
      await Promise.all([BrickMetadata.bulkWrite(metadataOperations)]);

      console.log(
        `Updated ${metadataOperations.length} metadata with cached colors`
      );
    }
  } catch (error) {
    console.error("Error updating bricks with cached colors:", error);
  }
}

async function fetchColorsForPieces(pieceIds, tableId, ownerId) {
  const result = { rateLimited: false };

  // Create an array of promises for each API fetch
  const fetchPromises = pieceIds.map(async (pieceId) => {
    try {
      // First check if this part is already marked as invalid
      const invalidCheck = await BrickMetadata.findOne(
        { elementId: pieceId, invalid: true },
        { _id: 0 }
      );

      // If it's already marked as invalid, skip API call
      if (invalidCheck) {
        console.log(
          `Piece ${pieceId} is already marked as invalid, skipping API call`
        );

        // Update the user brick to mark it as invalid
        await UserBrick.updateMany(
          { elementId: pieceId, tableId, ownerId },
          { $set: { invalid: true } }
        );

        return null;
      }

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
        console.warn(`Piece ${pieceId} not found, marking as invalid`);

        // Mark as invalid in the database
        await BrickMetadata.updateOne(
          { elementId: pieceId },
          {
            $set: {
              invalid: true,
              elementName: "Invalid/Missing ID",
              availableColors: [{ empty: true }],
            },
          },
          { upsert: true }
        );

        // Also update the user bricks
        await UserBrick.updateMany(
          { elementId: pieceId, tableId, ownerId },
          { $set: { invalid: true } }
        );

        return null;
      }

      if (!response.ok) {
        throw new Error(`Error fetching colors: ${response.statusText}`);
      }

      const data = await response.json();

      console.log(`Fetched ${data.results.length} colors for piece ${pieceId}`);

      // Only proceed if we have actual results
      if (!data.results || data.results.length === 0) {
        console.warn(
          `No colors found for piece ${pieceId}, but API response was OK`
        );

        // Update metadata to indicate no colors (but not invalid)
        await BrickMetadata.updateOne(
          { elementId: pieceId },
          {
            $set: {
              availableColors: [],
              invalid: false,
              elementName: (await fetchPartName(pieceId)) || `Part ${pieceId}`,
              cacheIncomplete: true, // Mark as cache incomplete
            },
          },
          { upsert: true }
        );

        return null;
      }

      // Map the API response to our schema format
      const colorData = {
        elementId: pieceId,
        availableColors: data.results.map((result) => ({
          colorId: result.color_id,
          color: result.color_name,
          elementImage: result.part_img_url,
        })),
      };

      // Fetch part name if we don't have it
      const partName = await fetchPartName(pieceId);

      // Save to cache, update user brick, and update metadata
      await Promise.all([
        // Update brick metadata
        BrickMetadata.updateOne(
          { elementId: pieceId },
          {
            $set: {
              availableColors: colorData.availableColors,
              invalid: false,
              elementName: partName || `Part ${pieceId}`,
              cacheIncomplete: false,
            },
          },
          { upsert: true }
        ),

        // Update user bricks to make sure they're marked as valid
        UserBrick.updateMany(
          { elementId: pieceId, tableId, ownerId },
          {
            $set: {
              availableColors: colorData.availableColors,
              invalid: false,
            },
          }
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
  const processed = await Promise.all(fetchPromises);
  return {
    results: processed.filter((item) => item !== null),
    rateLimited: result.rateLimited,
  };
}

/**
 * Helper function to fetch part name if not already known
 *
 * @param {string} pieceId - The piece ID to fetch name for
 * @returns {Promise<string|null>} The part name or null if not found
 */
async function fetchPartName(pieceId) {
  try {
    // Check if we already have the name in metadata
    const existingMetadata = await BrickMetadata.findOne(
      { elementId: pieceId },
      { elementName: 1, _id: 0 }
    );

    if (
      existingMetadata?.elementName &&
      existingMetadata.elementName !== "Invalid/Missing ID"
    ) {
      return existingMetadata.elementName;
    }

    // Otherwise fetch from API
    const res = await fetch(
      `https://rebrickable.com/api/v3/lego/parts/${pieceId}`,
      {
        headers: {
          Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
          "User-Agent":
            "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
        },
      }
    );

    if (!res.ok) {
      return null;
    }

    const data = await res.json();
    return data.name;
  } catch (error) {
    console.error(`Error fetching part name for ${pieceId}:`, error);
    return null;
  }
}
