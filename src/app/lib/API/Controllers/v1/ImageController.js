// src/app/lib/API/Controllers/v1/ImageController.js

import BaseController from "../BaseController";
import { BrickMetadata } from "@/lib/Mongo/Schema";
import dbConnect from "@/lib/Mongo/Mongo";
import externalApiService from "@/lib/API/ExternalApiService";

/**
 * Controller for handling LEGO part images
 */
class ImageController extends BaseController {
  constructor() {
    super("ImageController");
  }

  /**
   * Get an image URL for a specific part and color
   *
   * @param {Request} req - The request object
   * @param {Object} context - Context object with params
   * @returns {Response} JSON response with image URL
   */
  async getImage(req, context) {
    const { params } = context;
    const { pieceId, colorId } = await this.getParams(params);

    if (!pieceId || !colorId) {
      return this.errorResponse("Missing piece ID or color ID", 400);
    }

    try {
      // Connect to database
      await dbConnect();

      // Check if we already have this image cached in our metadata
      const existingImage = await this.checkExistingImage(pieceId, colorId);
      if (existingImage) {
        return this.successResponse({ part_img_url: existingImage });
      }

      // If not found in our database, fetch from external API service
      const imageUrl = await externalApiService.fetchImageForPiece(
        pieceId,
        colorId
      );

      if (!imageUrl) {
        return this.errorResponse("Image not found", 404);
      }

      // Cache this image URL in our database (don't await to keep response fast)
      this.cacheImageUrl(pieceId, colorId, imageUrl);

      return this.successResponse({ part_img_url: imageUrl });
    } catch (error) {
      console.error(
        `Error fetching image for pieceId ${pieceId} and colorId ${colorId}:`,
        error
      );
      return this.errorResponse("Failed to fetch image", 500);
    }
  }

  /**
   * Check if we already have an image URL for this part/color combination
   *
   * @param {string} pieceId - The piece ID
   * @param {string} colorId - The color ID
   * @returns {string|null} Image URL if found, null otherwise
   */
  async checkExistingImage(pieceId, colorId) {
    try {
      // Find the brick metadata
      const metadata = await BrickMetadata.findOne(
        { elementId: pieceId },
        { availableColors: 1 }
      ).lean();

      // If we have metadata with available colors
      if (
        metadata &&
        metadata.availableColors &&
        metadata.availableColors.length > 0
      ) {
        // Find the matching color
        const colorData = metadata.availableColors.find(
          (c) => c.colorId === colorId.toString()
        );

        // Return the image URL if found
        if (colorData && colorData.elementImage) {
          return colorData.elementImage;
        }
      }

      return null;
    } catch (error) {
      console.error("Error checking existing image:", error);
      return null;
    }
  }

  /**
   * Cache image URL for future use
   *
   * @param {string} pieceId - The piece ID
   * @param {string} colorId - The color ID
   * @param {string} imageUrl - The image URL to cache
   */
  cacheImageUrl(pieceId, colorId, imageUrl) {
    // Update metadata with new image URL
    BrickMetadata.updateOne(
      {
        elementId: pieceId,
        "availableColors.colorId": colorId.toString(),
      },
      {
        $set: { "availableColors.$.elementImage": imageUrl },
      }
    ).catch((err) => {
      console.error(
        `Error caching image URL for part ${pieceId}, color ${colorId}:`,
        err
      );
    });
  }
}

export default new ImageController();
