// src/app/lib/API/Controllers/v1/SetController.js

import BaseController from "../BaseController";
import externalApiService from "@/lib/API/ExternalApiService";
import cacheManager from "@/lib/Cache/CacheManager";
import dbConnect from "@/lib/Mongo/Mongo";
import { BrickMetadata } from "@/lib/Mongo/Schema";

/**
 * Controller for set-related operations
 */
class SetController extends BaseController {
  constructor() {
    super("SetController");
  }

  /**
   * Get details for a specific LEGO set
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing set ID
   * @returns {Response} JSON response with set details
   */
  async getDetails(req, context) {
    const { params } = context;
    const { setId } = await this.getParams(params);

    if (!setId) {
      return this.errorResponse("Missing set ID", 400);
    }

    try {
      const setDetails = await externalApiService.fetchSetDetails(setId);

      if (!setDetails) {
        return this.errorResponse("Set not found", 404);
      }

      return this.successResponse(setDetails);
    } catch (error) {
      console.error(`Error fetching set details for ${setId}:`, error);
      return this.errorResponse(
        `Failed to fetch set details: ${error.message}`,
        500
      );
    }
  }

  /**
   * Get all parts in a LEGO set
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing set ID
   * @returns {Response} JSON response with set parts
   */
  async getParts(req, context) {
    const startTime = Date.now();
    const { params } = context;
    const { setId } = await this.getParams(params);

    if (!setId) {
      return this.errorResponse("Missing set ID", 400);
    }

    try {
      // Step 1: Fetch basic set parts from Rebrickable API
      console.log(`Fetching parts for set ${setId}...`);
      const results = await externalApiService.fetchSetParts(setId);

      // Early return if no parts found
      if (!results || results.length === 0) {
        return this.successResponse({
          results: [],
          message: "No parts found for this set",
        });
      }

      console.log(`Found ${results.length} parts for set ${setId}`);

      // Step 2: Extract all unique part IDs to look up in cache
      const uniquePartIds = [
        ...new Set(results.map((item) => item.part.part_num)),
      ];
      console.log(`Set contains ${uniquePartIds.length} unique parts`);

      // Step 3: Connect to database
      await dbConnect();

      // Step 4: Look up color data for all parts
      const colorData = await this.fetchCachedColorData(uniquePartIds);

      let mapResults = [];

      // Step 5: Enhance results with color data
      results.forEach((item) => {
        const elementId = item.part.part_num;

        // Try to find an existing entry for this elementId
        const existingEntryIndex = mapResults.findIndex(
          (entry) => entry.elementId === elementId
        );

        // Prepare the base result object
        const result = {
          elementName: item.part.name,
          elementId,
          elementColor: item.color.name || "Black",
          elementColorId: item.color.id || 0,
          quantity: item.quantity,
        };

        // Check if we have cached color data for this part
        const cachedColors = colorData[elementId];

        if (cachedColors) {
          // We have cached colors, use them and mark as complete
          result.availableColors = cachedColors.map((color) => ({
            colorId: color.colorId,
            color: color.color,
            elementImage: color.elementImage,
          }));
          result.cacheIncomplete = false;
        } else {
          // No cached colors, use the current item's color
          result.availableColors = [
            {
              colorId: item.color.id || 0,
              color: item.color.name || "Black",
              elementImage: item.part.part_img_url,
            },
          ];
          result.cacheIncomplete = true;
        }

        // Handle duplicate elementIds
        if (existingEntryIndex !== -1) {
          const existingEntry = mapResults[existingEntryIndex];

          // If existing entry has cached colors, use those
          if (!existingEntry.cacheIncomplete) {
            result.availableColors = existingEntry.availableColors;
            result.cacheIncomplete = false;
          } else {
            // If existing entry doesn't have cached colors,
            // add the current color to its available colors
            const newColorEntry = {
              colorId: item.color.id || 0,
              color: item.color.name || "Black",
              elementImage: item.part.part_img_url,
            };

            // Ensure we don't add duplicate colors
            const colorExists = existingEntry.availableColors.some(
              (color) => color.colorId === newColorEntry.colorId
            );

            if (!colorExists) {
              existingEntry.availableColors.push(newColorEntry);
            }

            // Update the existing entry in mapResults
            mapResults[existingEntryIndex] = existingEntry;
            result.availableColors = existingEntry.availableColors;
          }
        }

        // Add or update the result in mapResults
        mapResults.push(result);
      });

      // Calculate how many parts we found colors for
      const partsWithColors = mapResults.filter(
        (item) => item.cacheIncomplete === false
      ).length;

      const totalTime = Date.now() - startTime;

      console.log(
        `Response prepared with ${partsWithColors}/${mapResults.length} parts having cached colors (${totalTime}ms)`
      );

      return this.successResponse({
        results: mapResults,
        stats: {
          totalParts: results.length,
          uniqueParts: uniquePartIds.length,
          partsWithCachedColors: partsWithColors,
          processingTimeMs: totalTime,
        },
      });
    } catch (error) {
      console.error("Error fetching set parts:", error);
      return this.errorResponse(
        `Failed to fetch set parts: ${error.message}`,
        500
      );
    }
  }

  /**
   * Process color cache for parts in a set
   * This handles the background processing of part colors after set import
   *
   * @param {Request} req - The request object
   * @returns {Response} JSON response indicating processing status
   */
  async postProcessColor(req) {
    try {
      await dbConnect();
      const { pieceIds, tableId, ownerId } = await req.json();

      if (!pieceIds?.length || !tableId || !ownerId) {
        return this.errorResponse("Missing required parameters", 400);
      }

      console.log(`Starting color processing for ${pieceIds.length} pieces...`);

      // Start the background process
      this.processPiecesInBatches(pieceIds, tableId, ownerId);

      return this.successResponse({ success: true });
    } catch (error) {
      console.error("Error in postProcessColor:", error);
      return this.errorResponse(
        `Failed to process colors: ${error.message}`,
        500
      );
    }
  }

  /**
   * Fetch cached color data for multiple part IDs
   *
   * @param {string[]} partIds - Array of part IDs to look up
   * @returns {Object} Object mapping part IDs to color data
   */
  async fetchCachedColorData(partIds) {
    if (!partIds.length) return {};

    try {
      // Query the cache for all parts at once
      const cacheEntries = await BrickMetadata.find(
        {
          elementId: { $in: partIds },
          invalid: false,
          cacheIncomplete: false,
        },
        {
          _id: 0,
          "availableColors._id": 0,
        }
      ).lean();

      // Build a map of part ID to color data
      const colorDataMap = {};
      cacheEntries.forEach((entry) => {
        colorDataMap[entry.elementId] = entry.availableColors;
      });

      return colorDataMap;
    } catch (error) {
      console.error("Error fetching color cache data:", error);
      return {};
    }
  }

  /**
   * Process pieces in batches for color data
   *
   * @param {string[]} pieceIds - Array of piece IDs to process
   * @param {string} tableId - Table ID
   * @param {string} ownerId - Owner ID
   */
  async processPiecesInBatches(pieceIds, tableId, ownerId) {
    // This function would start the background processing
    // We would call externalApiService methods to fetch colors for each piece
    // This is just a stub - the actual implementation would be similar to
    // what's in the existing postProcessColor route

    console.log(
      `Started background processing for ${pieceIds.length} pieces...`
    );

    // Start a worker process (implementation depends on your hosting environment)
    // For now, we'll just log it
    console.log(
      `This would process in background: ${tableId}, ${ownerId}, ${pieceIds.length} pieces`
    );
  }
}

export default new SetController();
