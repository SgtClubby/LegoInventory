// src/app/api/image/[pieceId]/[colorId]/route.js

import { BrickMetadata } from "@/lib/Mongo/Schema";
import dbConnect from "@/lib/Mongo/Mongo";

/**
 * GET image URL for a specific LEGO part and color
 *
 * @param {Request} req - The request object
 * @param {Object} params - Route parameters containing pieceId and colorId
 * @returns {Response} JSON response with image URL
 */
export async function GET(_req, { params }) {
  const { pieceId, colorId } = await params;

  try {
    // First check if we have this image cached in our metadata
    await dbConnect();

    // Look for this exact part/color combination in our database
    const existingImage = await checkExistingImage(pieceId, colorId);
    if (existingImage) {
      console.log(
        `Image found in database for pieceId ${pieceId} and colorId ${colorId}`
      );
      return Response.json({ part_img_url: existingImage }, { status: 200 });
    }

    // If not found in our database, fetch from Rebrickable API
    const result = await fetchImageFromRebrickable(pieceId, colorId);

    if (result.status === 404 || !result?.part_img_url) {
      console.log(
        `Image not found for pieceId ${pieceId} and colorId ${colorId}`
      );
      return Response.json({ part_img_url: null }, { status: 404 });
    }

    // Cache this image URL in our database (don't await to keep response fast)
    cacheImageUrl(pieceId, colorId, result.part_img_url);

    return Response.json(
      { part_img_url: result.part_img_url },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      `Error fetching image for pieceId ${pieceId} and colorId ${colorId}:`,
      error
    );
    return Response.json({ error: "Failed to fetch image" }, { status: 500 });
  }
}

/**
 * Check if we already have an image URL for this part/color combination
 *
 * @param {string} pieceId - The piece ID
 * @param {string} colorId - The color ID
 * @returns {string|null} Image URL if found, null otherwise
 */
async function checkExistingImage(pieceId, colorId) {
  try {
    // Find the brick metadata
    const metadata = await BrickMetadata.findOne(
      { elementId: pieceId },
      { availableColors: 1 }
    ).lean();

    // If we have metadata with available colors
    if (
      metadata &&
      metadata.availableColors &&
      metadata.availableColors.length > 0
    ) {
      // Find the matching color
      const colorData = metadata.availableColors.find(
        (c) => c.colorId === colorId
      );

      // Return the image URL if found
      if (colorData && colorData.elementImage) {
        return colorData.elementImage;
      }
    }

    return null;
  } catch (error) {
    console.error("Error checking existing image:", error);
    return null;
  }
}

/**
 * Cache image URL for future use
 *
 * @param {string} pieceId - The piece ID
 * @param {string} colorId - The color ID
 * @param {string} imageUrl - The image URL to cache
 */
function cacheImageUrl(pieceId, colorId, imageUrl) {
  // Update both the metadata and color cache
  Promise.all([
    // Update brick metadata
    BrickMetadata.updateOne(
      {
        elementId: pieceId,
        "availableColors.colorId": colorId,
      },
      {
        $set: { "availableColors.$.elementImage": imageUrl },
      }
    ),
  ]).catch((err) => {
    console.error(
      `Error caching image URL for part ${pieceId}, color ${colorId}:`,
      err
    );
  });
}

/**
 * Fetch image from Rebrickable API
 *
 * @param {string} pieceId - The piece ID
 * @param {string} colorId - The color ID
 * @returns {Object} Object with status and part_img_url
 */
export async function fetchImageFromRebrickable(pieceId, colorId) {
  const url = `https://rebrickable.com/api/v3/lego/parts/${pieceId}/colors/${colorId}/`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    });

    if (!res.ok) {
      return { status: res.status, part_img_url: null };
    }

    const data = await res.json();
    
    return { part_img_url: data?.part_img_url || null, status: res.status };
  } catch (err) {
    console.error(
      `Error fetching image for pieceId ${pieceId} and colorId ${colorId}:`,
      err
    );
    return { status: 500, part_img_url: null };
  }
}
