// src/app/lib/API/Controllers/v1/MinifigController.js

import BaseController from "../BaseController";
import dbConnect from "@/lib/Mongo/Mongo";
import {
  UserMinifig,
  MinifigMetadata,
  MinifigPriceMetadata,
  MinifigPriceHistory,
  Table,
} from "@/lib/Mongo/Schema";
import cacheManager from "@/lib/Cache/CacheManager";
import priceDataHandler from "@/lib/Services/PriceDataHandler";
import priceHistoryService from "@/lib/Services/PriceHistoryService";
import config from "@/lib/Config/config";
import BricklinkController from "./BricklinkController";

/**
 * Controller for managing minifigs
 */
class MinifigController extends BaseController {
  constructor() {
    super("MinifigController");
  }

  /**
   * Get all minifigs for a specific table
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing tableId
   * @returns {Response} JSON response with minifigs data
   */
  async get(req, context) {
    const { params } = context;
    const { tableId } = await this.getParams(params);
    const ownerId = this.getOwnerId(req);

    if (!tableId) {
      return this.errorResponse("Missing table ID", 400);
    }

    try {
      await dbConnect();

      // Verify table exists and is a minifig table
      const currentTable = await Table.findOne({ id: tableId, ownerId }).lean();
      if (!currentTable) {
        return this.errorResponse("Table not found", 404);
      }

      if (!currentTable.isMinifig) {
        return this.errorResponse(
          "This is a brick table, not a minifig table",
          400
        );
      }

      // Get user-specific minifig data
      const userMinifigs = await UserMinifig.find(
        { tableId, ownerId },
        { __v: 0, _id: 0, updatedAt: 0 }
      ).lean();

      // Extract unique minifig IDs to fetch metadata efficiently
      const minifigIdsRebrickable = [
        ...new Set(userMinifigs.map((minifig) => minifig.minifigIdRebrickable)),
      ];

      // Fetch metadata for all needed minifigs in a single query
      const minifigMetadataList = await MinifigMetadata.find(
        {
          minifigIdRebrickable: { $in: minifigIdsRebrickable },
        },
        { _id: 0, __v: 0, updatedAt: 0 }
      ).lean();

      const minifigPriceMetadataList = await MinifigPriceMetadata.find(
        {
          minifigIdRebrickable: { $in: minifigIdsRebrickable },
        },
        { _id: 0, __v: 0, updatedAt: 0 }
      ).lean();

      // Create metadata lookup map for faster access
      const metadataMap = {};
      minifigMetadataList.forEach((meta) => {
        metadataMap[meta.minifigIdRebrickable] = meta;
      });

      const priceMetadataMap = {};
      minifigPriceMetadataList.forEach((meta) => {
        priceMetadataMap[meta.minifigIdRebrickable] = meta;
      });

      // Prepare minifigs with basic metadata
      const completeMinifigs = userMinifigs.map((userMinifig) => {
        const metadata = metadataMap[userMinifig.minifigIdRebrickable] || {};
        const priceData =
          priceMetadataMap[userMinifig.minifigIdRebrickable] || {};
        return {
          ...userMinifig,
          minifigName: metadata.minifigName || "Unknown Minifig",
          minifigImage: metadata.minifigImage || null,
          priceData: priceData.priceData || null,
        };
      });

      const expiredMinifigPrices = [];

      // Check for expired prices and add to list
      Object.keys(completeMinifigs).forEach(async (minifigId) => {
        const minifig = completeMinifigs[minifigId];
        const priceMetadata = priceMetadataMap[minifig.minifigIdRebrickable];
        if (!minifig.priceData || priceMetadata?.isExpired) {
          expiredMinifigPrices.push({
            minifigIdRebrickable: minifig.minifigIdRebrickable,
            minifigIdBricklink: minifig.minifigIdBricklink,
            minifigName: minifig.minifigName,
            minifigImage: minifig.minifigImage,
          });
          priceHistoryService.archiveCurrentPriceData(
            minifig.minifigIdRebrickable
          );
        }
      });

      // Start background processing without awaiting result
      if (expiredMinifigPrices.length > 0) {
        const batchId = Date.now().toString(36);
        console.log(
          `Starting background processing for batch ${batchId} with ${expiredMinifigPrices.length} minifigs`
        );
        BricklinkController.processBatchesInBackground(
          expiredMinifigPrices,
          batchId
        );
      }

      // Sort minifigs by name
      completeMinifigs.sort((a, b) => {
        const nameA = a.minifigName || "";
        const nameB = b.minifigName || "";
        return nameA.localeCompare(nameB);
      });

      return this.successResponse(completeMinifigs);
    } catch (error) {
      console.error("Error fetching minifigs:", error);
      return this.errorResponse("Failed to fetch minifigs", 500);
    }
  }

  /**
   * Add new minifigs to a table
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing tableId
   * @returns {Response} JSON response indicating success or failure
   */
  async post(req, context) {
    const { params } = context;
    const { tableId } = await this.getParams(params);
    const ownerId = this.getOwnerId(req);
    const body = await req.json();

    const minifigs = Array.isArray(body) ? body : [body];

    if (!tableId) {
      return this.errorResponse("Missing table ID", 400);
    }

    try {
      await dbConnect();

      // Verify table exists and is a minifig table
      const currentTable = await Table.findOne({ id: tableId, ownerId }).lean();
      if (!currentTable) {
        return this.errorResponse("Table not found", 404);
      }

      if (!currentTable.isMinifig) {
        return this.errorResponse(
          "This is a brick table, not a minifig table",
          400
        );
      }

      const userMinifigsToInsert = [];
      const minifigMetadataToUpsert = [];
      const minifigPriceMetadataToUpsert = [];

      // Process each minifig
      for (const minifig of minifigs) {
        // Prepare user-specific minifig data
        userMinifigsToInsert.push({
          updateOne: {
            filter: { minifigIdRebrickable: minifig.minifigIdRebrickable },
            update: {
              $set: {
                uuid: minifig.uuid,
                minifigIdRebrickable: minifig.minifigIdRebrickable,
                minifigIdBricklink: minifig?.minifigIdBricklink || "",
                minifigQuantity: minifig.minifigQuantity || 0,
                highlighted: false,
                tableId,
                ownerId,
              },
            },
            upsert: true,
          },
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
                  minifigImage: minifig.minifigImage,
                },
              },
              upsert: true,
            },
          });
        }

        if (minifig.priceData) {
          // Check if we have an exisitng price for this minifig
          const existingPrice = await MinifigPriceMetadata.findOne(
            { minifigIdRebrickable: minifig.minifigIdRebrickable },
            { _id: 0, expiresAt: 1, createdAt: 1 }
          ).lean();

          if (existingPrice) {
            await priceHistoryService.archiveCurrentPriceData(
              minifig.minifigIdRebrickable
            );
          }

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
                  isExpired: false,
                  expiresAt: new Date(Date.now() + config.cacheExpiry.price),
                },
              },
              upsert: true,
            },
          });
        }
      }

      // Perform operations in parallel for efficiency
      await Promise.all([
        UserMinifig.bulkWrite(userMinifigsToInsert),
        // Only do the metadata bulkWrite if we have operations
        minifigMetadataToUpsert.length > 0
          ? MinifigMetadata.bulkWrite(minifigMetadataToUpsert)
          : Promise.resolve(),
        minifigPriceMetadataToUpsert.length > 0
          ? MinifigPriceMetadata.bulkWrite(minifigPriceMetadataToUpsert)
          : Promise.resolve(),
      ]);

      return this.successResponse(
        { count: userMinifigsToInsert.length },
        "Minifigs added successfully"
      );
    } catch (error) {
      console.error("Error saving minifigs:", error);
      return this.errorResponse(
        `Failed to save minifigs: ${error.message}`,
        500
      );
    }
  }

  /**
   * Update a specific minifig
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing tableId and minifigId
   * @returns {Response} JSON response indicating success or failure
   */
  async patch(req, context) {
    const { params } = context;
    const { tableId, minifigId } = await this.getParams(params);
    const ownerId = this.getOwnerId(req);
    const body = await req.json();

    if (!tableId || !minifigId || !body) {
      return this.errorResponse("Missing required parameters", 400);
    }

    try {
      await dbConnect();

      // Find the current minifig
      const currentMinifig = await UserMinifig.findOne(
        { uuid: minifigId, tableId, ownerId },
        { minifigIdRebrickable: 1, _id: 0 }
      );

      if (!currentMinifig) {
        return this.errorResponse("Minifig not found", 404);
      }

      // Handle price data separately if provided
      if (body.priceData) {
        // Archive current price data to history before updating
        await priceHistoryService.archiveCurrentPriceData(
          currentMinifig.minifigIdRebrickable
        );

        // Update with new price data
        await MinifigPriceMetadata.updateOne(
          { minifigIdRebrickable: currentMinifig.minifigIdRebrickable },
          {
            $set: {
              priceData: body.priceData,
              isExpired: false,
              expiresAt: new Date(Date.now() + config.cacheExpiry.price),
            },
          },
          { upsert: true }
        );

        // Update cache
        const cachedData = await cacheManager.getMinifigMetadata(
          currentMinifig.minifigIdRebrickable
        );

        if (cachedData) {
          await cacheManager.setMinifigMetadata(cachedData, body.priceData);
        }
      }

      // Handle metadata separately if provided
      if (body.minifigName || body.minifigImage || body.minifigIdBricklink) {
        const metadataUpdates = {};
        if (body.minifigName) metadataUpdates.minifigName = body.minifigName;
        if (body.minifigImage) metadataUpdates.minifigImage = body.minifigImage;
        if (body.minifigIdBricklink)
          metadataUpdates.minifigIdBricklink = body.minifigIdBricklink;

        await MinifigMetadata.updateOne(
          { minifigIdRebrickable: currentMinifig.minifigIdRebrickable },
          { $set: metadataUpdates },
          { upsert: true }
        );
      }

      // Always update the user minifig
      await UserMinifig.updateOne(
        { uuid: minifigId, tableId, ownerId },
        { $set: body }
      );

      return this.successResponse({}, "Minifig updated successfully");
    } catch (error) {
      console.error("Error updating minifig:", error);
      return this.errorResponse(
        `Failed to update minifig: ${error.message}`,
        500
      );
    }
  }

  /**
   * Delete a minifig from a table
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing tableId and minifigId
   * @returns {Response} JSON response indicating success or failure
   */
  async delete(req, context) {
    const { params } = context;
    const { tableId, minifigId } = await this.getParams(params);
    const ownerId = this.getOwnerId(req);

    if (!tableId || !minifigId) {
      return this.errorResponse("Missing tableId or minifigId", 400);
    }

    try {
      await dbConnect();

      // We only delete the user's minifig instance, never the metadata
      const result = await UserMinifig.deleteOne({
        uuid: minifigId,
        tableId,
        ownerId,
      });

      if (result.deletedCount === 0) {
        return this.errorResponse("Minifig not found", 404);
      }

      return this.successResponse({}, "Minifig deleted successfully");
    } catch (error) {
      console.error("Error deleting minifig:", error);
      return this.errorResponse(
        `Failed to delete minifig: ${error.message}`,
        500
      );
    }
  }
}

export default new MinifigController();
