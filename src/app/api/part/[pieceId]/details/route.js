// src/app/api/part/[pieceId]/details/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { BrickMetadata } from "@/lib/Mongo/Schema";

/**
 * Get details for a specific LEGO part
 *
 * @param {Request} req - The request object
 * @param {Object} params - Route parameters containing pieceId
 * @returns {Response} JSON response with part details
 */
export async function GET(req, { params }) {
  const { pieceId } = await params;

  try {
    // First check if we already have this part in our metadata
    await dbConnect();
    const existingMetadata = await BrickMetadata.findOne(
      { elementId: pieceId },
      {
        _id: 0,
        "availableColors._id": 0,
      }
    ).lean();

    // If we have complete metadata with at least one color that has an image
    if (
      existingMetadata?.elementName &&
      existingMetadata?.availableColors?.some((color) => color.elementImage)
    ) {
      // Find the first color with an image to use as the default
      const firstColorWithImage = existingMetadata.availableColors.find(
        (color) => color.elementImage
      );

      return Response.json({
        partNum: existingMetadata.elementId,
        name: existingMetadata.elementName,
        partImgUrl: firstColorWithImage?.elementImage,
        availableColors: existingMetadata.availableColors,
        fromCache: true,
      });
    }

    // Otherwise fetch from Rebrickable API
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
      return Response.json({ error: "No part found" }, { status: 404 });
    }

    if (res.status == 404) {
      return Response.json({ error: "No part found" }, { status: 404 });
    }

    const data = await res.json();

    updateBrickMetadata(pieceId, data);

    return Response.json({
      partNum: data.part_num,
      name: data.name,
      partUrl: data.part_url,
      partImgUrl: data.elementImage,
    });
  } catch (error) {
    console.error(`Error fetching details for piece ${pieceId}:`, error);
    return Response.json(
      { error: "Failed to fetch part details" },
      { status: 500 }
    );
  }
}

/**
 * Update brick metadata in the background
 *
 * @param {string} partId - Brick element ID
 * @param {Object} data - Brick data from Rebrickable API
 */
function updateBrickMetadata(partId, data) {
  // Check if this is a valid part before updating
  const isValid = data && data.name;

  BrickMetadata.updateOne(
    { elementId: partId },
    {
      $set: {
        elementName: isValid ? data.name : "Invalid/Missing ID",
        invalid: !isValid, // Very important - set invalid flag correctly!
      },
      $setOnInsert: { elementId: partId },
    },
    { upsert: true }
  ).catch((err) => {
    console.error(`Error updating metadata for part ${partId}:`, err);
  });
}
