// src/app/api/table/[tableId]/brick/[brickId]/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { UserBrick, BrickMetadata } from "@/lib/Mongo/Schema";
/**
 * DELETE a specific brick from a user's table
 *
 * @param {Request} req - The request object
 * @param {Object} params - The route parameters containing tableId and brickId
 * @returns {Response} JSON response indicating success or failure
 */
export async function DELETE(req, { params }) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { tableId, brickId: uuid } = await params;

  try {
    // We only delete the user's brick instance, never the metadata
    await UserBrick.deleteOne({ uuid, tableId, ownerId });
    return Response.json({ success: true });
  } catch (e) {
    console.error("Error deleting brick:", e);
    return Response.json({ error: "Failed to delete brick" }, { status: 500 });
  }
}

/**
 * PATCH/update a specific brick in a user's table
 *
 * @param {Request} req - The request object
 * @param {Object} params - The route parameters containing tableId and brickId
 * @returns {Response} JSON response indicating success or failure
 */
// In src/app/api/table/[tableId]/brick/[brickId]/route.js
export async function PATCH(req, { params }) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { brickId: uuid, tableId } = await params;
  const body = await req.json();

  console.log(
    `[PATCH] Received update for brick ${uuid}: ${JSON.stringify(
      body,
      null,
      2
    )}`
  );

  if (!tableId || !uuid || !body) {
    return Response.json(
      { error: "Missing required parameters" },
      { status: 400 }
    );
  }

  try {
    // Find the current brick to get its element ID
    const currentBrick = await UserBrick.findOne(
      { uuid, tableId, ownerId },
      { elementId: 1, invalid: 1, _id: 0 }
    );

    if (!currentBrick) {
      return Response.json({ error: "Brick not found" }, { status: 404 });
    }

    // Is this an element ID update?
    const isElementIdUpdate = body.hasOwnProperty("elementId");
    const elementId = isElementIdUpdate
      ? body.elementId
      : currentBrick.elementId;

    // Check if this part ID is invalid in our metadata
    let isInvalidPart = false;

    if (isElementIdUpdate) {
      // For element ID updates, verify with API if needed
      const validationResult = await _fetchPartDetails(elementId);
      isInvalidPart = !validationResult || !validationResult.name;

      // Set the invalid flag in the updates accordingly
      if (isInvalidPart) {
        body.invalid = true;
        body.elementName = "Invalid/Missing ID";
        body.availableColors = [{ empty: true }];
      } else if (validationResult) {
        body.invalid = false;
        body.elementName = validationResult.name;
      }
    } else {
      // For non-ID updates, check the database
      const metadataCheck = await BrickMetadata.findOne(
        { elementId: currentBrick.elementId },
        { invalid: 1, _id: 0 }
      );

      isInvalidPart = metadataCheck?.invalid === true;
    }

    // Separate user-specific updates and metadata updates
    const userUpdates = { ...body };
    const metadataUpdates = {};

    // Only prepare metadata updates for valid parts
    if (!isInvalidPart) {
      // Extract fields that should go to metadata
      if (body.elementName) metadataUpdates.elementName = body.elementName;
      if (body.availableColors)
        metadataUpdates.availableColors = body.availableColors;

      // Update metadata if there are changes and the part is valid
      if (Object.keys(metadataUpdates).length > 0) {
        await BrickMetadata.updateOne(
          { elementId },
          {
            $set: metadataUpdates,
            $setOnInsert: {
              elementId,
              invalid: false,
            },
          },
          { upsert: true }
        );
      }
    }

    // Always update the user brick
    await UserBrick.updateOne(
      { uuid, tableId, ownerId },
      { $set: userUpdates }
    );

    return Response.json({ success: true });
  } catch (e) {
    console.error("Error updating brick:", e);
    return Response.json(
      { error: "Failed to update brick: " + e.message },
      { status: 500 }
    );
  }
}

export async function _fetchPartDetails(pieceId) {
  try {
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

    if (res.status === 404) {
      console.warn(`Part "${pieceId}" not found.`);
      return null;
    }

    if (!res.ok) {
      console.log(
        `Failed to fetch part details for "${pieceId}":`,
        res.statusText
      );
      throw new Error(`Failed to fetch part details: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`Error fetching part details for "${pieceId}":`, err);
    return null;
  }
}
