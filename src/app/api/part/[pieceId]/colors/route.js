// src/app/api/part/[pieceId]/colors/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { BrickMetadata } from "@/lib/Mongo/Schema";

/**
 * Get available colors for a specific LEGO part
 *
 * @param {Request} req - The request object
 * @param {Object} params - Route parameters containing pieceId
 * @returns {Response} JSON response with available colors
 */
export async function GET(req, { params }) {
  const { pieceId } = await params;

  try {
    await dbConnect();

    // Try to find colors in cache first
    const ColorCache = await BrickMetadata.findOne(
      {
        elementId: { $eq: pieceId },
      },
      {
        _id: 0,
        __v: 0,
        "availableColors._id": 0,
      }
    );

    // Validate cache data
    if (ColorCache) {
      console.log("HIT! Cache found for pieceId:", pieceId);
      return Response.json(ColorCache.availableColors);
    }

    // If not in cache or invalid, fetch from Rebrickable API
    const res = await fetch(
      `https://rebrickable.com/api/v3/lego/parts/${pieceId}/colors/`,
      {
        headers: {
          Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
          "User-Agent":
            "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
        },
      }
    );

    if (!res.ok) {
      return Response.json(
        { error: "Failed to fetch!" },
        { status: res.status }
      );
    }

    const data = await res.json();

    if (!data.results.length > 0) {
      return Response.json({ error: "No colors found" }, { status: 404 });
    }

    // Format the results consistently
    const formattedResults = data.results.map((item) => ({
      colorId: item.color_id,
      color: item.color_name,
      elementImage: item.part_img_url,
    }));

    // Short delay to avoid race conditions
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Update the cache with the new data
    // Check if formattedResults is empty or null
    // If it is, set the cache to null
    // This is to avoid storing all the key-value pairs in the database for pices that dont exist
    if (!formattedResults || formattedResults.length === 0) {
      await updateBrickMetadata(null, formattedResults);
    } else {
      await updateBrickMetadata(pieceId, formattedResults);
    }

    // Update both cache and metadata
    console.log("MISS! Cache created for pieceId:", pieceId);

    return Response.json(formattedResults);
  } catch (error) {
    console.error(`Error fetching colors for piece ${pieceId}:`, error);
    return Response.json({ error: "Failed to fetch colors" }, { status: 500 });
  }
}
/**
 * Update brick metadata with color information
 *
 * @param {string} pieceId - Brick element ID
 * @param {Array} colors - Array of color objects
 * @returns {Promise} Promise resolving to the database operation result
 */
function updateBrickMetadata(pieceId, colors) {
  return BrickMetadata.updateOne(
    { elementId: pieceId },
    {
      $set: { availableColors: colors },
      $setOnInsert: { elementId: pieceId },
    },
    { upsert: true }
  ).catch((err) => {
    console.error(`Error updating metadata colors for part ${pieceId}:`, err);
  });
}
