// src/app/api/table/[tableId]/minifig/route.js

import dbConnect from "@/lib/Mongo/Mongo";
import {
  UserMinifig,
  MinifigMetadata,
  MinifigPriceMetadata,
} from "@/lib/Mongo/Schema";

/**
 * GET all minifigs for a specific table with metadata included
 *
 * @param {Request} req - The request object
 * @param {Object} params - The route parameters containing tableId
 * @returns {Response} JSON response with minifigs data
 */
export async function GET(req, { params }) {
  await dbConnect();

  const ownerId = req.headers.get("ownerId") || "default";
  const { tableId } = await params;

  if (!tableId) {
    return Response.json({ error: "Missing table ID" }, { status: 400 });
  }

  try {
    // Get user-specific minifig data
    const userMinifigs = await UserMinifig.find(
      { tableId, ownerId },
      {
        __v: 0,
        _id: 0,
        updatedAt: 0,
      }
    ).lean();

    // Extract unique minifig IDs to fetch metadata efficiently
    const minifigIdsRebrickable = [
      ...new Set(userMinifigs.map((minifig) => minifig.minifigIdRebrickable)),
    ];

    // Fetch metadata for all needed minifigs in a single query
    const minifigMetadataList = await MinifigMetadata.find(
      { minifigIdRebrickable: { $in: minifigIdsRebrickable } },
      {
        _id: 0,
        __v: 0,
        createdAt: 0,
        updatedAt: 0,
      }
    ).lean();

    // Fetch metadata for all needed minifigs in a single query
    const minifigPricedataList = await MinifigPriceMetadata.find(
      { minifigIdRebrickable: { $in: minifigIdsRebrickable } },
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

    const priceDataMap = {};
    minifigPricedataList.forEach((meta) => {
      priceDataMap[meta.minifigIdRebrickable] = meta;
    });

    // Combine user data with metadata
    const completeMinifigs = userMinifigs.map((userMinifig) => {
      const metadata = metadataMap[userMinifig.minifigIdRebrickable] || {};
      const priceData = priceDataMap[userMinifig.minifigIdRebrickable] || {};
      return {
        ...userMinifig,
        minifigName: metadata.minifigName || "Unknown Minifig",
        minifigImage: metadata.minifigImage || null,
        priceData: priceData.priceData || {
          minifigIdRebrickable: metadata.minifigIdRebrickable,
          avgPriceNew: "N/A",
          maxPriceNew: "N/A",
          minPriceNew: "N/A",
          avgPriceUsed: "N/A",
          maxPriceUsed: "N/A",
          minPriceUsed: "N/A",
          currency: "USD",
        },
      };
    });

    return Response.json(completeMinifigs);
  } catch (e) {
    console.error("Error fetching minifigs:", e);
    return Response.json(
      { error: "Failed to fetch minifigs" },
      { status: 500 }
    );
  }
}

/**
 * POST new minifigs to a table
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

  // Assume body contains a single minifig or array of minifigs
  const minifigs = Array.isArray(body) ? body : [body];

  try {
    const minifigsToInsert = [];
    const minifigMetadataToUpsert = [];
    const minifigPriceMetadataToUpsert = [];

    // Process each minifig
    for (const minifig of minifigs) {
      // Prepare user-specific minifig data
      minifigsToInsert.push({
        uuid: minifig.uuid,
        minifigIdRebrickable: minifig.minifigIdRebrickable,
        minifigIdBricklink: minifig?.minifigIdBricklink || "",
        minifigQuantity: minifig.minifigQuantity || 0,
        highlighted: minifig.highlighted || false,
        tableId,
        ownerId,
      });

      // Prepare minifig metadata for upsert if we have metadata
      if (minifig.minifigName) {
        minifigMetadataToUpsert.push({
          updateOne: {
            filter: { minifigIdRebrickable: minifig.minifigIdRebrickable },
            update: {
              $set: {
                minifigName: minifig.minifigName,
                minifigIdRebrickable: minifig.minifigIdRebrickable,
                minifigIdBricklink: minifig.minifigIdBricklink,
                minifigImage: minifig.minifigImage || "",
              },
            },
            upsert: true,
          },
        });
      }

      if (minifig.priceData) {
        minifigPriceMetadataToUpsert.push({
          updateOne: {
            filter: { minifigIdRebrickable: minifig.minifigIdRebrickable },
            update: {
              $set: {
                minifigIdRebrickable: minifig.minifigIdRebrickable,
                priceData: {
                  avgPriceNew: minifig.priceData.avgPriceNew || 0,
                  maxPriceNew: minifig.priceData.maxPriceNew || 0,
                  minPriceNew: minifig.priceData.minPriceNew || 0,

                  avgPriceUsed: minifig.priceData.avgPriceUsed || 0,
                  maxPriceUsed: minifig.priceData.maxPriceUsed || 0,
                  minPriceUsed: minifig.priceData.minPriceUsed || 0,

                  currencyCode: minifig.priceData.currencyCode || "USD",
                  currencySymbol: minifig.priceData.currencySymbol || "$",
                },
              },
            },
            upsert: true,
          },
        });
      }
    }

    // Perform operations in parallel for efficiency
    await Promise.all([
      UserMinifig.insertMany(minifigsToInsert),
      // Only do the metadata bulkWrite if we have operations
      minifigMetadataToUpsert.length > 0
        ? MinifigMetadata.bulkWrite(minifigMetadataToUpsert)
        : Promise.resolve(),

      minifigPriceMetadataToUpsert.length > 0
        ? MinifigPriceMetadata.bulkWrite(minifigPriceMetadataToUpsert)
        : Promise.resolve(),
    ]);

    return Response.json({ success: true });
  } catch (e) {
    console.error("Error saving minifigs:", e);
    return Response.json(
      { error: "Failed to save minifigs: " + e.message },
      { status: 500 }
    );
  }
}

// src/app/api/v1/table/[tableId]/minifig/route.js

// import minifigController from '@/lib/API/Controllers/v1/MinifigController';

// /**
//  * GET handler for retrieving all minifigs in a table
//  */
// export const GET = minifigController.withErrorHandling(
//   minifigController.get.bind(minifigController)
// );

// /**
//  * POST handler for adding minifigs to a table
//  */
// export const POST = minifigController.withErrorHandling(
//   minifigController.post.bind(minifigController)
// );
