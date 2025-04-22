// \Users\Clomby\Projects\LegoInventory\src\app\api\part\[pieceId]\details\route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { BrickMetadata } from "@/lib/Mongo/Schema";

/**
 * Get details for a specific LEGO part
 *
 * @param {Request} req - The request object
 * @param {Object} params - Route parameters containing pieceId
 * @returns {Response} JSON response with part details
 */
// In src/app/api/part/[pieceId]/details/route.js
// Modify the GET handler
export async function GET(req, { params }) {
  const { pieceId } = await params;

  try {
    // First check if we already have this part in our metadata
    await dbConnect();
    const existingMetadata = await BrickMetadata.findOne(
      { elementId: pieceId },
      {
        _id: 0,
        invalid: 1,
        elementName: 1,
      }
    ).lean();

    // If we have an invalid entry already, return that
    if (existingMetadata?.invalid === true) {
      return Response.json({ error: "Invalid piece ID" }, { status: 404 });
    }

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
      // Mark as invalid in the database for future lookups
      await updateBrickMetadata(pieceId, null, true);
      return Response.json({ error: "No part found" }, { status: 404 });
    }

    const data = await res.json();

    // Update the metadata with valid data
    await updateBrickMetadata(pieceId, data, false);

    return Response.json({
      partNum: data.part_num,
      name: data.name,
      partUrl: data.part_url,
      partImgUrl: data.part_img_url,
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
 * @param {boolean} isInvalid - Whether this part is invalid
 */
async function updateBrickMetadata(partId, data, isInvalid) {
  // If part is invalid, store it with the invalid flag
  if (isInvalid) {
    return BrickMetadata.updateOne(
      { elementId: partId },
      {
        $set: {
          elementName: "Invalid/Missing ID",
          invalid: true,
          availableColors: [{ empty: true }],
        },
      },
      { upsert: true }
    ).catch((err) => {
      console.error(`Error updating invalid metadata for part ${partId}:`, err);
    });
  }

  // Otherwise store the valid data
  return BrickMetadata.updateOne(
    { elementId: partId },
    {
      $set: {
        elementName: data.name,
        invalid: false,
      },
      $setOnInsert: { elementId: partId },
    },
    { upsert: true }
  ).catch((err) => {
    console.error(`Error updating metadata for part ${partId}:`, err);
  });
}
