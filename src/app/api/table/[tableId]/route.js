// src/app/api/table/[tableId]/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import { UserBrick, BrickMetadata } from "@/lib/Mongo/Schema";

/**
 * GET all bricks for a specific table with metadata included
 *
 * @param {Request} req - The request object
 * @param {Object} params - The route parameters containing tableId
 * @returns {Response} JSON response with bricks data
 */
export async function GET(req, { params }) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { tableId } = await params;

  if (!tableId) {
    return Response.json({ error: "Missing table ID" }, { status: 400 });
  }

  try {
    // Get user-specific brick data
    const userBricks = await UserBrick.find(
      { tableId, ownerId },
      {
        __v: 0,
        _id: 0,
        updatedAt: 0,
      }
    ).lean();

    // Extract unique element IDs to fetch metadata efficiently
    const elementIds = [...new Set(userBricks.map((brick) => brick.elementId))];

    // Fetch metadata for all needed bricks in a single query
    const brickMetadataList = await BrickMetadata.find(
      { elementId: { $in: elementIds } },
      {
        _id: 0,
        __v: 0,
        createdAt: 0,
        updatedAt: 0,
      }
    ).lean();

    // Create a lookup map for faster access
    const metadataMap = {};
    brickMetadataList.forEach((meta) => {
      metadataMap[meta.elementId] = meta;
    });

    // Combine user data with metadata
    const completeBricks = userBricks.map((userBrick) => {
      const metadata = metadataMap[userBrick.elementId] || {};

      if (userBrick.invalid) {
        return {
          ...userBrick,
          elementColorId: null,
          elementColor: null,
          elementName: "Invalid/Missing ID",
          availableColors: [{ empty: true }],
        };
      }

      // if metadata.cacheIncomplete is true, set elementColorId and elementColor to null
      if (metadata.cacheIncomplete === true) {
        userBrick.cacheIncomplete = true;
      }

      return {
        ...userBrick,
        elementName: metadata.elementName,
        availableColors: metadata.availableColors || [{ empty: true }],
      };
    });

    return Response.json(completeBricks);
  } catch (e) {
    console.error("Error fetching bricks:", e);
    return Response.json({ error: "Failed to fetch bricks" }, { status: 500 });
  }
}

/**
 * POST new bricks to a table
 *
 * @param {Request} req - The request object
 * @param {Object} params - The route parameters containing tableId
 * @returns {Response} JSON response indicating success or failure
 */
export async function POST(req, { params }) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { tableId } = await params;
  const body = await req.json();

  if (!tableId) {
    return Response.json({ error: "Missing table ID" }, { status: 400 });
  }

  // Assume body contains a single brick or array of bricks
  const bricks = Array.isArray(body) ? body : [body];

  

  try {
    const bricksToInsert = [];
    const metadataToUpsert = [];

    // Process each brick to separate user data from metadata
    for (const brick of bricks) {
      // Prepare user-specific brick data
      bricksToInsert.push({
        uuid: brick.uuid,
        elementId: brick.elementId,
        elementColorId: brick.elementColorId,
        elementColor: brick.elementColor,
        elementQuantityOnHand: brick.elementQuantityOnHand || 0,
        elementQuantityRequired: brick.elementQuantityRequired || 0,
        countComplete: brick.countComplete || false,
        tableId,
        ownerId,
      });

      // Prepare brick metadata for upsert
      metadataToUpsert.push({
        updateOne: {
          filter: { elementId: brick.elementId },
          update: {
            $set: {
              elementName: brick.elementName,
              availableColors: brick.availableColors || [],
              cacheIncomplete: brick.cacheIncomplete || false,
              invalid: false,
            },
          },
          upsert: true,
        },
      });
    }

    // Perform operations in parallel for efficiency
    await Promise.all([
      UserBrick.insertMany(bricksToInsert),
      // Only do the metadata bulkWrite if we have operations
      metadataToUpsert.length > 0
        ? BrickMetadata.bulkWrite(metadataToUpsert)
        : Promise.resolve(),
    ]);

    return Response.json({ success: true });
  } catch (e) {
    console.error("Error saving bricks:", e);
    return Response.json(
      { error: "Failed to save bricks: " + e.message },
      { status: 500 }
    );
  }
}
