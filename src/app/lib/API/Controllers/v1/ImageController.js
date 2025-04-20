// src/app/lib/API/Controllers/v1/ImageController.js

import BaseController from "../BaseController";
import cacheManager from "@/lib/Cache/CacheManager";
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
        return this.successResponse({ elementImage: existingImage });
      }

      // If not found in our database, fetch from external API service
      const imageUrl = await externalApiService.fetchImageForPiece(
        pieceId,
        colorId
      );

      if (!imageUrl) {
        return this.errorResponse("Image not found", 404);
      }

      return this.successResponse({ elementImage: imageUrl });
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
   * @returns {Promise<string|null>} Image URL if found, null otherwise
   */
  async checkExistingImage(pieceId, colorId) {
    try {
      // Find the brick metadata
      const metadata = cacheManager.getBrickMetadata(pieceId);

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
}

export default new ImageController();
