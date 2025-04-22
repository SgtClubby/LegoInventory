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
// In src/app/api/part/[pieceId]/colors/route.js
export async function GET(req, { params }) {
  let { pieceId } = await params;
  if (!pieceId) {
    return Response.json({ error: "Missing piece ID" }, { status: 400 });
  }

  try {
    await dbConnect();

    // First check if this part is marked as invalid
    const invalidCheck = await BrickMetadata.findOne(
      { elementId: pieceId, invalid: true },
      { _id: 0 }
    );

    if (invalidCheck) {
      console.log(`Part ${pieceId} is marked as invalid, returning 404`);
      return Response.json({ error: "Invalid part ID" }, { status: 404 });
    }

    // Try to find colors in cache first
    const existingCache = await BrickMetadata.findOne(
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
    if (
      existingCache?.availableColors?.length > 0 &&
      !existingCache.cacheIncomplete
    ) {
      console.log("HIT! Cache found for pieceId:", pieceId);
      return Response.json(existingCache.availableColors);
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

    if (res.status === 404) {
      // If the part is not found, mark it as invalid in the database
      await BrickMetadata.updateOne(
        { elementId: pieceId },
        {
          $set: {
            invalid: true,
            cacheIncomplete: false, // Mark as complete even if invalid
          },
        },
        { upsert: true }
      );
      return Response.json({ error: "Part not found" }, { status: 404 });
    }

    const data = await res.json();

    if (!data.results || !data.results.length) {
      // If no colors found but API response was OK, mark part as having no colors
      await BrickMetadata.updateOne(
        { elementId: pieceId },
        {
          $set: {
            invalid: false, // Not invalid, just no colors
            cacheIncomplete: true, // Mark as cache incomplete
          },
        },
        { upsert: true }
      );

      return Response.json({ error: "No colors found" }, { status: 404 });
    }

    // Format the results consistently
    const formattedResults = data.results.map((item) => ({
      colorId: item.color_id,
      color: item.color_name,
      elementImage: item.part_img_url,
    }));

    // Update the cache with the new data
    await BrickMetadata.updateOne(
      { elementId: pieceId },
      {
        $set: {
          availableColors: formattedResults,
          invalid: false, // Explicitly mark as valid
          cacheIncomplete: false,
        },
        $setOnInsert: { elementId: pieceId },
      },
      { upsert: true }
    );

    console.log("MISS! Cache created for pieceId:", pieceId);
    return Response.json(formattedResults);
  } catch (error) {
    return Response.json({ error: "Failed to fetch colors" }, { status: 500 });
  }
}
