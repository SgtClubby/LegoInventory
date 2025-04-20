// src/app/api/table/[tableId]/brick/[brickId]/route.js

import { withParamsHandling } from "@/lib/API/AppRouterUtils";
import dbConnect from "@/lib/Mongo/Mongo";
import { UserBrick, BrickMetadata } from "@/lib/Mongo/Schema";
import { errorResponse, successResponse } from "@/lib/API/ApiHelpers";

/**
 * DELETE a specific brick from a user's table
 *
 * @param {Request} req - The request object
 * @param {Object} params - The route parameters containing tableId and brickId
 * @returns {Response} JSON response indicating success or failure
 */
export const DELETE = withParamsHandling(async (req, { params }) => {
  try {
    await dbConnect();

    const ownerId = req.headers.get("ownerId") || "default";
    const { tableId, brickId: uuid } = params;

    if (!tableId || !uuid) {
      return errorResponse("Missing tableId or brickId", 400);
    }

    // We only delete the user's brick instance, never the metadata
    const result = await UserBrick.deleteOne({ uuid, tableId, ownerId });

    if (result.deletedCount === 0) {
      return errorResponse("Brick not found", 404);
    }

    return successResponse({}, "Brick deleted successfully");
  } catch (e) {
    console.error("Error deleting brick:", e);
    return errorResponse("Failed to delete brick: " + e.message, 500);
  }
});

/**
 * PATCH/update a specific brick in a user's table
 *
 * @param {Request} req - The request object
 * @param {Object} params - The route parameters containing tableId and brickId
 * @returns {Response} JSON response indicating success or failure
 */
export const PATCH = withParamsHandling(async (req, { params }) => {
  try {
    await dbConnect();

    const ownerId = req.headers.get("ownerId") || "default";
    const { brickId: uuid, tableId } = params;
    const body = await req.json();

    console.log(
      `[PATCH] Received update for brick ${uuid}: ${JSON.stringify(
        body,
        null,
        2
      )}`
    );

    if (!tableId || !uuid || !body) {
      return errorResponse("Missing required parameters", 400);
    }

    // Find the current brick to get its element ID
    const currentBrick = await UserBrick.findOne(
      { uuid, tableId, ownerId },
      { elementId: 1, invalid: 1, _id: 0 }
    );

    if (!currentBrick) {
      return errorResponse("Brick not found", 404);
    }

    // Is this an element ID update?
    const isElementIdUpdate = body.hasOwnProperty("elementId");
    const elementId = isElementIdUpdate
      ? body.elementId
      : currentBrick.elementId;

    // Check if this part ID is invalid in our metadata
    let isInvalidPart = false;

    if (isElementIdUpdate) {
      // For element ID updates, verify with metadata if available
      const metadataCheck = await BrickMetadata.findOne(
        { elementId: body.elementId },
        { invalid: 1, _id: 0 }
      );

      isInvalidPart = metadataCheck?.invalid === true;

      // Set the invalid flag in the updates accordingly
      if (isInvalidPart) {
        body.invalid = true;
        body.elementName = "Invalid/Missing ID";
        body.availableColors = [{ empty: true }];
      } else if (metadataCheck) {
        body.invalid = false;
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
    const updateResult = await UserBrick.updateOne(
      { uuid, tableId, ownerId },
      { $set: userUpdates }
    );

    if (updateResult.matchedCount === 0) {
      return errorResponse("Brick not found", 404);
    }

    return successResponse({}, "Brick updated successfully");
  } catch (e) {
    console.error("Error updating brick:", e);
    return errorResponse("Failed to update brick: " + e.message, 500);
  }
});
