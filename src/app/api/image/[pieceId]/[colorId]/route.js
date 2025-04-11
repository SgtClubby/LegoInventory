// src/app/api/image/[pieceId]/[colorId]/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { ColorCache } from "@/lib/Mongo/Schema";

export async function GET(req, { params }) {
  await dbConnect();
  const { pieceId } = params;

  if (!pieceId) {
    return Response.json({ error: "Missing piece ID" }, { status: 400 });
  }

  try {
    // Try to get from cache first
    const cache = await ColorCache.findOne(
      { elementId: pieceId },
      { _id: 0, __v: 0, createdAt: 0 }
    ).lean();

    // Check if cache is valid (has proper structure)
    if (
      cache &&
      cache.availableColors &&
      cache.availableColors.length > 0 &&
      cache.availableColors.every((color) => color.colorId && color.color)
    ) {
      console.log("CACHE HIT: Using cached colors for pieceId:", pieceId);
      return Response.json(cache.availableColors);
    }

    // If no valid cache, fetch from API
    console.log("CACHE MISS: Fetching colors from API for pieceId:", pieceId);
    const res = await fetch(
      `https://rebrickable.com/api/v3/lego/parts/${pieceId}/colors/`,
      {
        headers: {
          Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
          "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch colors from API: ${res.statusText}`);
    }

    const data = await res.json();

    // Transform API response to our expected format
    const colorResults = data.results.map((item) => ({
      colorId: item.color_id,
      color: item.color_name,
    }));

    // Save to cache for future requests
    await ColorCache.updateOne(
      { elementId: pieceId },
      {
        $set: {
          elementId: pieceId,
          availableColors: colorResults,
        },
      },
      { upsert: true }
    );

    return Response.json(colorResults);
  } catch (error) {
    console.error(`Error processing colors for pieceId ${pieceId}:`, error);
    return Response.json(
      { error: error.message || "Failed to fetch colors" },
      { status: 500 }
    );
  }
}
