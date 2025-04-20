// src/app/lib/API/Controllers/v1/PartController.js

import BaseController from "../BaseController";
import dbConnect from "@/lib/Mongo/Mongo";
import { BrickMetadata } from "@/lib/Mongo/Schema";
import externalApiService from "@/lib/API/ExternalApiService";
import cacheManager from "@/lib/Cache/CacheManager";

/**
 * Controller for handling LEGO part information
 */
class PartController extends BaseController {
  constructor() {
    super("PartController");
  }

  /**
   * Get part details
   *
   * @param {Request} req - The request object
   * @param {Object} context - Context object with params
   * @returns {Response} JSON response with part details
   */
  async getDetails(req, context) {
    const { params } = context;
    const { pieceId } = await this.getParams(params);

    if (!pieceId) {
      return this.errorResponse("Missing piece ID", 400);
    }

    try {
      await dbConnect();

      // First check if we already have this part in our metadata
      const existingMetadata = cacheManager.getBrickMetadata(pieceId);

      // If we have an invalid entry already, return that
      if (existingMetadata?.invalid === true) {
        return this.errorResponse("Invalid piece ID", 404);
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

        return this.successResponse({
          partNum: existingMetadata.elementId,
          name: existingMetadata.elementName,
          partImgUrl: firstColorWithImage?.elementImage,
          availableColors: existingMetadata.availableColors,
          fromCache: true,
        });
      }

      // Otherwise fetch from API service
      const partDetails = await externalApiService.fetchPartDetails(pieceId);

      if (!partDetails) {
        return this.errorResponse("Part not found", 404);
      }

      return this.successResponse({
        partNum: partDetails.elementId,
        name: partDetails.name,
        partImgUrl: partDetails.part_img_url,
        availableColors: partDetails.availableColors,
        fromCache: false,
      });
    } catch (error) {
      console.error(`Error fetching details for piece ${pieceId}:`, error);
      return this.errorResponse("Failed to fetch part details", 500);
    }
  }

  /**
   * Get available colors for a part
   *
   * @param {Request} req - The request object
   * @param {Object} context - Context object with params
   * @returns {Response} JSON response with available colors
   */
  async getColors(req, context) {
    const { params } = context;
    let { pieceId } = await this.getParams(params);

    if (!pieceId) {
      return this.errorResponse("Missing piece ID", 400);
    }

    let cacheIncomplete = false;

    try {
      await dbConnect();

      // First check if this part is marked as invalid
      const invalidCheck = await BrickMetadata.findOne(
        { elementId: pieceId, invalid: true },
        { _id: 0 }
      );

      if (invalidCheck) {
        return this.errorResponse("Invalid part ID", 404);
      }

      // Try to find colors in cache first
      const cachedMetadata = await BrickMetadata.findOne(
        {
          elementId: { $eq: pieceId },
        },
        {
          _id: 0,
          __v: 0,
          "availableColors._id": 0,
        }
      ).lean();

      // Validate cache data
      if (
        cachedMetadata?.availableColors?.length > 0 &&
        !cacheIncomplete &&
        !cachedMetadata.cacheIncomplete
      ) {
        console.log("Cache hit for pieceId:", pieceId);
        return this.successResponse(cachedMetadata.availableColors);
      }

      // Fetch colors from API service
      const availableColors = await externalApiService.fetchPartColors(pieceId);

      if (!availableColors || availableColors.length === 0) {
        // If no colors found but part is valid, mark as having no colors
        await BrickMetadata.updateOne(
          { elementId: pieceId },
          {
            $set: {
              availableColors: [],
              invalid: false, // Not invalid, just no colors
              cacheIncomplete: true, // Mark as cache incomplete
            },
          },
          { upsert: true }
        );

        return this.errorResponse("No colors found", 404);
      }

      // Update the cache with the new data
      await BrickMetadata.updateOne(
        { elementId: pieceId },
        {
          $set: {
            availableColors: availableColors,
            invalid: false,
            cacheIncomplete: false,
          },
          $setOnInsert: { elementId: pieceId },
        },
        { upsert: true }
      );

      console.log("Cache created for pieceId:", pieceId);
      return this.successResponse(availableColors);
    } catch (error) {
      console.error(`Error fetching colors for piece ${pieceId}:`, error);
      return this.errorResponse("Failed to fetch colors", 500);
    }
  }

  /**
   * Update brick metadata in the database
   *
   * @param {string} partId - Brick element ID
   * @param {Object} data - Brick data from API
   * @param {boolean} isInvalid - Whether this part is invalid
   */
  async updateBrickMetadata(data, isInvalid) {
    // If part is invalid, store it with the invalid flag
    if (isInvalid) {
      return cacheManager.setBrickMetadata({
        elementName: "Invalid/Missing ID",
        invalid: true,
        availableColors: [{ empty: true }],
      });
    }

    // Otherwise store the valid data
    return cacheManager.setBrickMetadata({
      elementName: data.name,
      invalid: false,
    });
  }
}

export default new PartController();
