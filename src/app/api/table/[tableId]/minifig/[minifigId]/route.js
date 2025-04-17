// src/app/api/table/[tableId]/minifig/[minifigId]/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { UserMinifig, MinifigMetadata } from "@/lib/Mongo/Schema";

/**
 * DELETE a specific minifig from a user's table
 *
 * @param {Request} req - The request object
 * @param {Object} params - The route parameters containing tableId and minifigId
 * @returns {Response} JSON response indicating success or failure
 */
export async function DELETE(req, { params }) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { tableId, minifigId: uuid } = await params;

  try {
    // We only delete the user's minifig instance, never the metadata
    await UserMinifig.deleteOne({ uuid, tableId, ownerId });
    return Response.json({ success: true });
  } catch (e) {
    console.error("Error deleting minifig:", e);
    return Response.json(
      { error: "Failed to delete minifig" },
      { status: 500 }
    );
  }
}

/**
 * PATCH/update a specific minifig in a user's table
 *
 * @param {Request} req - The request object
 * @param {Object} params - The route parameters containing tableId and minifigId
 * @returns {Response} JSON response indicating success or failure
 */
export async function PATCH(req, { params }) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { minifigId: uuid, tableId } = await params;
  const body = await req.json();

  console.log(
    `[PATCH] Received update for minifig ${uuid}: ${JSON.stringify(
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
    // Find the current minifig
    const currentMinifig = await UserMinifig.findOne(
      { uuid, tableId, ownerId },
      { minifigId: 1, _id: 0 }
    );

    if (!currentMinifig) {
      return Response.json({ error: "Minifig not found" }, { status: 404 });
    }

    // Is this a minifig ID update?
    const isMinifigIdUpdate = body.hasOwnProperty("minifigId");
    const minifigId = isMinifigIdUpdate
      ? body.minifigId
      : currentMinifig.minifigId;

    // Check if this is a quantity update that affects completion status
    if (
      body.hasOwnProperty("minifigQuantityOnHand") ||
      body.hasOwnProperty("minifigQuantityRequired")
    ) {
      // Get current values if needed
      let onHand = body.minifigQuantityOnHand;
      let required = body.minifigQuantityRequired;

      if (onHand === undefined || required === undefined) {
        const currentValues = await UserMinifig.findOne(
          { uuid, tableId, ownerId },
          {
            minifigQuantityOnHand: 1,
            minifigQuantityRequired: 1,
            _id: 0,
          }
        );

        onHand =
          onHand !== undefined ? onHand : currentValues.minifigQuantityOnHand;
        required =
          required !== undefined
            ? required
            : currentValues.minifigQuantityRequired;
      }

      // Calculate completion status
      const isComplete = required === 0 ? null : onHand >= required;
      body.countComplete = isComplete;
    }

    // If this is a minifig ID update, we may need to fetch updated metadata
    if (isMinifigIdUpdate && body.minifigId) {
      // You could add logic here to fetch updated metadata from an API
      // For now, we'll just update the minifigId
      console.log(`Minifig ID changed to: ${body.minifigId}`);
    }

    // Always update the user minifig
    await UserMinifig.updateOne({ uuid, tableId, ownerId }, { $set: body });

    return Response.json({ success: true });
  } catch (e) {
    console.error("Error updating minifig:", e);
    return Response.json(
      { error: "Failed to update minifig: " + e.message },
      { status: 500 }
    );
  }
}
