// src/app/api/table/[tableId]/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import {
  UserBrick,
  BrickMetadata,
  UserMinifig,
  MinifigMetadata,
  MinifigPriceMetadata,
  Table,
} from "@/lib/Mongo/Schema";

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

  const currentTable = await Table.find({ id: tableId, ownerId }).lean();
  const isMinifig = currentTable[0]?.isMinifig || false;

  if (isMinifig) {
    return fetchUserMinifigs(tableId, ownerId);
  } else {
    return fetchUserBricks(tableId, ownerId);
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

async function fetchUserBricks(tableId, ownerId) {
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

async function fetchUserMinifigs(tableId, ownerId) {
  try {
    // Get user-specific brick data
    const userMinifigs = await UserMinifig.find(
      { tableId, ownerId },
      {
        __v: 0,
        _id: 0,
        updatedAt: 0,
      }
    ).lean();

    // Extract unique minifig IDs to fetch metadata efficiently
    const minifigIds = [
      ...new Set(userMinifigs.map((minifig) => minifig.minifigIdRebrickable)),
    ];
    // Fetch metadata for all needed minifigs in a single query
    const minifigMetadataList = await MinifigMetadata.find(
      { minifigIdRebrickable: { $in: minifigIds } },
      {
        _id: 0,
        __v: 0,
        createdAt: 0,
        updatedAt: 0,
      }
    ).lean();

    const minifigPriceMetadataList = await MinifigPriceMetadata.find(
      { minifigIdRebrickable: { $in: minifigIds } },
      {
        _id: 0,
        __v: 0,
        createdAt: 0,
        updatedAt: 0,
      }
    ).lean();

    // Create a lookup map for faster access
    const metadataMap = {};
    minifigMetadataList.forEach((meta) => {
      metadataMap[meta.minifigIdRebrickable] = meta;
    });

    const priceMetadataMap = {};

    minifigPriceMetadataList.forEach((meta) => {
      priceMetadataMap[meta.minifigIdRebrickable] = meta;
    });

    // Combine user data with metadata
    const completeMinifigs = userMinifigs.map((userMinifig) => {
      const metadata = metadataMap[userMinifig.minifigIdRebrickable] || {};
      const priceMetadata =
        priceMetadataMap[userMinifig.minifigIdRebrickable] || {};

      if (userMinifig.invalid) {
        return {
          ...userMinifig,
          minifigImage: null,
          minifigName: "Invalid/Missing ID",
        };
      }

      const cleanDecimal = (decimal) => {
        if (decimal && typeof decimal.toString === "function") {
          return parseFloat(decimal.toString());
        }
        return decimal;
      };

      const { priceData } = priceMetadata;

      const parsedPriceData = Object.fromEntries(
        Object.entries(priceData).map(([key, value]) => {
          if (
            value &&
            typeof value === "object" &&
            typeof value.toString === "function"
          ) {
            return [key, cleanDecimal(value)];
          }
          return [key, value];
        })
      );

      return {
        ...userMinifig,
        minifigImage: metadata.minifigImage,
        minifigName: metadata.minifigName,
        priceData: {
          avgPriceNew: parsedPriceData.avgPriceNew || "N/A",
          maxPriceNew: parsedPriceData.maxPriceNew || "N/A",
          minPriceNew: parsedPriceData.minPriceNew || "N/A",
          avgPriceUsed: parsedPriceData.avgPriceUsed || "N/A",
          maxPriceUsed: parsedPriceData.maxPriceUsed || "N/A",
          minPriceUsed: parsedPriceData.minPriceUsed || "N/A",
          currencyCode: parsedPriceData.currencyCode || "USD",
        },
      };
    });
    // Sort minifigs by name
    completeMinifigs.sort((a, b) => {
      const nameA = a.minifigName || "";
      const nameB = b.minifigName || "";
      return nameA.localeCompare(nameB);
    });
    // Return the sorted array

    return Response.json(completeMinifigs);
  } catch (e) {
    console.error("Error fetching minifigs:", e);
    return Response.json(
      { error: "Failed to fetch minifigs" },
      { status: 500 }
    );
  }
}
