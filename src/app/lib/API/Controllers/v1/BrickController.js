// src/app/lib/API/Controllers/v1/BrickController.js

import BaseController from "../BaseController";
import dbConnect from "@/lib/Mongo/Mongo";
import { UserBrick, BrickMetadata, Table } from "@/lib/Mongo/Schema";
import cacheManager from "@/lib/Cache/CacheManager";

/**
 * Controller for managing bricks/pieces
 */
class BrickController extends BaseController {
  constructor() {
    super("BrickController");
  }

  /**
   * Get all bricks for a specific table
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing tableId
   * @returns {Response} JSON response with bricks data
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

      // Verify table exists and is not a minifig table
      const currentTable = await Table.findOne({ id: tableId, ownerId }).lean();
      if (!currentTable) {
        return this.errorResponse("Table not found", 404);
      }

      if (currentTable.isMinifig) {
        return this.errorResponse(
          "This is a minifig table, not a brick table",
          400
        );
      }

      // Get user-specific brick data
      const userBricks = await UserBrick.find(
        { tableId, ownerId },
        { __v: 0, _id: 0, updatedAt: 0 }
      ).lean();

      // Extract unique element IDs to fetch metadata efficiently
      const elementIds = [
        ...new Set(userBricks.map((brick) => brick.elementId)),
      ];

      // Fetch metadata for all needed bricks in a single query
      const brickMetadataList = await BrickMetadata.find(
        { elementId: { $in: elementIds } },
        { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 }
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

      return this.successResponse(completeBricks);
    } catch (error) {
      console.error("Error fetching bricks:", error);
      return this.errorResponse("Failed to fetch bricks", 500);
    }
  }

  /**
   * Add new bricks to a table
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

    const data = Array.isArray(body) ? body : [body];

    if (!tableId) {
      return this.errorResponse("Missing table ID", 400);
    }

    try {
      await dbConnect();

      // Verify table exists and is not a minifig table
      const currentTable = await Table.findOne({ id: tableId, ownerId }).lean();
      if (!currentTable) {
        return this.errorResponse("Table not found", 404);
      }

      if (currentTable.isMinifig) {
        return this.errorResponse(
          "This is a minifig table, not a brick table",
          400
        );
      }

      const bricksToInsert = [];
      const metadataToUpsert = [];

      // Process each brick to separate user data from metadata
      for (const brick of data) {
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

      return this.successResponse(
        { count: bricksToInsert.length },
        "Bricks added successfully"
      );
    } catch (error) {
      console.error("Error saving bricks:", error);
      return this.errorResponse(`Failed to save bricks: ${error.message}`, 500);
    }
  }

  /**
   * Update a specific brick
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing tableId and brickId
   * @returns {Response} JSON response indicating success or failure
   */
  async patch(req, context) {
    const { params } = context;
    const { tableId, brickId } = await this.getParams(params);
    const ownerId = this.getOwnerId(req);
    const body = await req.json();

    if (!tableId || !brickId || !body) {
      return this.errorResponse("Missing required parameters", 400);
    }

    try {
      await dbConnect();

      // Find the current brick to get its element ID
      const currentBrick = await UserBrick.findOne(
        { uuid: brickId, tableId, ownerId },
        { elementId: 1, invalid: 1, _id: 0 }
      );

      if (!currentBrick) {
        return this.errorResponse("Brick not found", 404);
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

          // Update cache
          await cacheManager.setBrickMetadata({
            elementId,
            ...metadataUpdates,
            invalid: false,
          });
        }
      }

      // Always update the user brick
      const updateResult = await UserBrick.updateOne(
        { uuid: brickId, tableId, ownerId },
        { $set: userUpdates }
      );

      if (updateResult.matchedCount === 0) {
        return this.errorResponse("Brick not found", 404);
      }

      return this.successResponse({}, "Brick updated successfully");
    } catch (error) {
      console.error("Error updating brick:", error);
      return this.errorResponse(
        `Failed to update brick: ${error.message}`,
        500
      );
    }
  }

  /**
   * Delete a brick from a table
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing tableId and brickId
   * @returns {Response} JSON response indicating success or failure
   */
  async delete(req, context) {
    const { params } = context;
    const { tableId, brickId } = await this.getParams(params);
    const ownerId = this.getOwnerId(req);

    if (!tableId || !brickId) {
      return this.errorResponse("Missing tableId or brickId", 400);
    }

    try {
      await dbConnect();

      // We only delete the user's brick instance, never the metadata
      const result = await UserBrick.deleteOne({
        uuid: brickId,
        tableId,
        ownerId,
      });

      if (result.deletedCount === 0) {
        return this.errorResponse("Brick not found", 404);
      }

      return this.successResponse({}, "Brick deleted successfully");
    } catch (error) {
      console.error("Error deleting brick:", error);
      return this.errorResponse(
        `Failed to delete brick: ${error.message}`,
        500
      );
    }
  }
}

export default new BrickController();
