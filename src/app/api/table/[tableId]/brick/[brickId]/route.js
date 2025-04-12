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
export async function PATCH(req, { params }) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { brickId: uuid, tableId } = await params;
  const body = await req.json();

  console.log(`[PATCH] Received update for brick ${uuid} in table ${tableId}`);
  // the body might have a long availableColors array, so i want to just snip it to max of 2 elemets in the available colors array
  // and then stringify it to make it easier to read in the logs
  const bodyCopy = { ...body };
  if (bodyCopy.availableColors) {
    bodyCopy.availableColors = bodyCopy.availableColors.slice(0, 2);
    bodyCopy.availableColors.push("...");
  }
  console.log("[PATCH] Payload:", bodyCopy);

  if (!tableId) {
    return Response.json({ error: "Missing table ID" }, { status: 400 });
  }

  if (!uuid) {
    return Response.json({ error: "Missing brick ID" }, { status: 400 });
  }

  if (!body) {
    return Response.json({ error: "Missing body" }, { status: 400 });
  }

  try {
    const operations = [];

    // Separate user-specific updates and metadata updates
    const userUpdates = {};
    const metadataUpdates = {};

    // Determine which fields belong to which schema
    for (const [key, value] of Object.entries(body)) {
      if (["elementName", "availableColors"].includes(key)) {
        metadataUpdates[key] = value;
      } else {
        userUpdates[key] = value;
      }

      // Handle special case for invalid flag
      if (key["invalid"] === true) {
        console.log("Invalid flag set to true, updating metadata");
        userUpdates.invalid = value;
        metadataUpdates.invalid = value;
      }
    }

    // First, get the brick to update metadata if needed
    if (Object.keys(metadataUpdates).length > 0) {
      const brick = await UserBrick.findOne(
        { uuid, tableId, ownerId },
        { elementId: 1 }
      );

      if (brick && !metadataUpdates.invalid) {
        // Update metadata if the brick is valid
        operations.push(
          BrickMetadata.updateOne(
            { elementId: brick.elementId },
            { $set: metadataUpdates },
            { upsert: true }
          )
        );
      } else {
        // If the brick is invalid, we don't update metadata
        console.log("Brick is invalid, skipping metadata update");
      }
    }

    // Update user-specific data if needed
    if (Object.keys(userUpdates).length > 0) {
      operations.push(
        UserBrick.updateOne({ uuid, tableId, ownerId }, { $set: userUpdates })
      );
    }

    // Execute all operations in parallel
    await Promise.all(operations);

    return Response.json({ success: true });
  } catch (e) {
    console.error("Error updating brick:", e);
    return Response.json(
      { error: "Failed to update brick: " + e.message },
      { status: 500 }
    );
  }
}
