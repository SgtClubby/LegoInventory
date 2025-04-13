// src/app/api/set/[setId]/parts/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { BrickMetadata } from "@/lib/Mongo/Schema";

/**
 * Fetch parts for a LEGO set, including cached color data if available
 *
 * @param {Request} req - The request object
 * @param {Object} params - URL parameters including setId
 * @returns {Response} JSON response with set parts and available colors
 */
export async function GET(req, { params }) {
  const startTime = Date.now();
  try {
    const { setId } = await params;
    if (!setId) {
      return Response.json({ error: "Missing set ID" }, { status: 400 });
    }

    // Step 1: Fetch basic set parts from Rebrickable API
    console.log(`Fetching parts for set ${setId}...`);
    const results = await fetchBasicSetParts(
      `https://rebrickable.com/api/v3/lego/sets/${setId}/parts?page_size=1000`
    );

    // Early return if no parts found
    if (!results || results.length === 0) {
      return Response.json({
        results: [],
        message: "No parts found for this set",
      });
    }

    console.log(`Found ${results.length} parts for set ${setId}`);

    // Step 2: Extract all unique part IDs to look up in cache
    const uniquePartIds = [
      ...new Set(results.map((item) => item.part.part_num)),
    ];
    console.log(`Set contains ${uniquePartIds.length} unique parts`);

    // Step 3: Connect to database
    await dbConnect();

    // Step 4: Look up metadata and color data for all parts
    const [colorData, metadataEntries] = await Promise.all([
      fetchCachedColorData(uniquePartIds),
      fetchExistingMetadata(uniquePartIds),
    ]);

    console.log(
      `Found color data for ${
        Object.keys(colorData).length
      } parts in cache and metadata for ${metadataEntries.length} parts`
    );

    // Create a metadata lookup map
    const metadataMap = {};
    metadataEntries.forEach((entry) => {
      metadataMap[entry.elementId] = entry;
    });

    // Step 5: Enhance results with color data and update metadata if needed
    const enhancedResults = results.map((item) => {
      const partId = item.part.part_num;

      let result = {
        elementName: item.part.name,
        elementId: partId,
        elementColor: item.color.name || "Black",
        elementColorId: item.color.id || 0,
        quantity: item.quantity,
      };

      // Add availableColors from cache if we have it
      if (colorData[partId]) {
        result.availableColors = colorData[partId].map((color) => ({
          colorId: color.colorId,
          color: color.color,
          elementImage: color.elementImage,
        }));
      } else {
        // return single from origin

        result.availableColors = [
          {
            colorId: item.color.id || 0,
            color: item.color.name || "Black",
            elementImage: item.part.part_img_url,
          },
        ];
        result.cacheIncomplete = true;
      }

      // Store/update metadata in the background (don't await to keep response fast)
      updateBrickMetadata(partId, item.part.name, item.part.part_img_url);

      return result;
    });

    // Calculate how many parts we found colors for
    const partsWithColors = enhancedResults.filter(
      (item) => item.availableColors && item.availableColors.length > 1
    ).length;
    const totalTime = Date.now() - startTime;

    console.log(
      `Response prepared with ${partsWithColors}/${results.length} parts having cached colors (${totalTime}ms)`
    );

    return Response.json({
      results: enhancedResults,
      stats: {
        totalParts: results.length,
        uniqueParts: uniquePartIds.length,
        partsWithCachedColors: partsWithColors,
        processingTimeMs: totalTime,
      },
    });
  } catch (error) {
    console.error("Error fetching set parts:", error);
    return Response.json(
      {
        error: error.message || "Failed to fetch set parts",
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch existing metadata for bricks
 *
 * @param {string[]} partIds - Array of part IDs to look up
 * @returns {Array} Array of metadata objects
 */
async function fetchExistingMetadata(partIds) {
  try {
    return await BrickMetadata.find(
      { elementId: { $in: partIds }, invalid: false },
      { _id: 0, __v: 0 }
    ).lean();
  } catch (error) {
    console.error("Error fetching brick metadata:", error);
    return [];
  }
}

/**
 * Update brick metadata in the background
 *
 * @param {string} partId - Brick element ID
 * @param {string} name - Brick name
 */
function updateBrickMetadata(partId, name) {
  // Don't await this to keep the response fast - run in background
  BrickMetadata.updateOne(
    { elementId: partId, invalid: false },
    {
      $set: {
        elementName: name,
      },
      $setOnInsert: { elementId: partId },
    },
    { upsert: true }
  ).catch((err) => {
    console.error(`Error updating metadata for part ${partId}:`, err);
  });
}

/**
 * Fetch parts data from Rebrickable API
 *
 * @param {string} url - The API URL to fetch from
 * @returns {Array} Array of part results
 */
async function fetchBasicSetParts(url) {
  let allResults = [];
  let currentUrl = url;

  while (currentUrl) {
    try {
      const res = await fetch(currentUrl, {
        headers: {
          Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
          "User-Agent":
            "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
        },
      });

      if (!res.ok) {
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // Check if we got valid results
      if (!Array.isArray(data.results)) {
        throw new Error("Invalid API response: results is not an array");
      }

      // Filter out spare parts and null/undefined items
      const validResults = data.results.filter(
        (item) => item != null && item.is_spare !== true
      );

      allResults = allResults.concat(validResults);

      // Check if there are more pages
      currentUrl = data.next;

      // Log progress for multiple pages
      if (currentUrl) {
        console.log(
          `Fetched ${allResults.length} parts so far, getting next page...`
        );
      }
    } catch (error) {
      console.warn("Error fetching parts from API:", error);
      break; // Exit the loop on error
    }
  }

  return allResults;
}

/**
 * Fetch cached color data for multiple part IDs
 *
 * @param {string[]} partIds - Array of part IDs to look up
 * @returns {Object} Object mapping part IDs to color data
 */
async function fetchCachedColorData(partIds) {
  if (!partIds.length) return {};

  try {
    // Query the cache for all parts at once
    const cacheEntries = await BrickMetadata.find(
      {
        elementId: { $in: partIds },
        invalid: false,
        availableColors: { $exists: true, $ne: [] },
      },
      { elementId: 1, availableColors: 1, _id: 0 }
    ).lean();

    // Build a map of part ID to color data
    const colorDataMap = {};
    cacheEntries.forEach((entry) => {
      colorDataMap[entry.elementId] = entry.availableColors;
    });

    return colorDataMap;
  } catch (error) {
    console.error("Error fetching color cache data:", error);
    return {};
  }
}
