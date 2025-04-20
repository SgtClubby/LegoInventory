// src/app/lib/API/Controllers/v1/SearchController.js

import BaseController from "../BaseController";
import externalApiService from "@/lib/API/ExternalApiService";

/**
 * Controller for search functionality
 */
class SearchController extends BaseController {
  constructor() {
    super("SearchController");
    this.searchAbortController = null;
  }

  /**
   * Search for LEGO sets
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing search term
   * @returns {Response} JSON response with search results
   */
  async searchSet(req, context) {
    const { params } = context;
    const { searchTerm } = await this.getParams(params);

    if (!searchTerm) {
      return this.errorResponse("Missing search term", 400);
    }

    try {
      const data = await externalApiService.searchSets(searchTerm);
      return this.successResponse(data);
    } catch (error) {
      console.error("Error searching sets:", error);
      return this.errorResponse(`Failed to search sets: ${error.message}`, 500);
    }
  }

  /**
   * Search for LEGO parts
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing search term
   * @returns {Response} JSON response with search results
   */
  async searchPart(req, context) {
    const { params } = context;
    const { searchTerm } = await this.getParams(params);

    if (!searchTerm) {
      return this.errorResponse("Missing search term", 400);
    }

    try {
      const data = await externalApiService.searchParts(searchTerm);

      // Filter out unwanted items
      const filteredResults = data.results
        .filter((item) => {
          const filteredNames = ["Duplo", "Modulex"];
          return !filteredNames.some((name) => item.name.includes(name));
        })
        .map((item) => ({
          part_num: item.part_num,
          name: item.name,
          part_img_url: item.part_img_url,
        }));

      data.results = filteredResults;

      return this.successResponse(data);
    } catch (error) {
      console.error("Error searching parts:", error);
      return this.errorResponse(
        `Failed to search parts: ${error.message}`,
        500
      );
    }
  }

  /**
   * Search for minifigs
   *
   * @param {Request} req - The request object
   * @param {Object} params - Route parameters containing search term
   * @returns {Response} JSON response with search results
   */
  async searchMinifig(req, context) {
    const { params } = context;
    const { searchTerm } = await this.getParams(params);

    if (!searchTerm) {
      return this.errorResponse("Missing search term", 400);
    }

    try {
      // Cancel any previous ongoing search
      if (this.searchAbortController) {
        this.searchAbortController.abort();
      }

      // Create a new abort controller for this search
      this.searchAbortController = new AbortController();

      // Determine if this is a search by ID or by keyword
      const brickLinkIdRegex = /^[a-z]{2,4}\d{1,4}[a-z]?$/i;
      const rebrickableIdRegex = /^[a-z]{2,3}-\d{1,6}$/i;
      const isBricklinkQuery = brickLinkIdRegex.test(searchTerm.trim());
      const isRebrickableQuery = rebrickableIdRegex.test(searchTerm.trim());

      let searchResults;

      if (isBricklinkQuery || isRebrickableQuery) {
        // Search by ID with special handling
        searchResults = await this.searchMinifigById(
          searchTerm,
          this.searchAbortController.signal
        );
      } else {
        // Regular search by name/term
        searchResults = await externalApiService.searchMinifigs(searchTerm);
      }

      // Format the results
      const formattedResults = searchResults.map((result) => ({
        minifigIdRebrickable: result.set_num,
        minifigName: result.name,
        minifigImage: result.set_img_url,
      }));

      return this.successResponse({
        results: formattedResults,
        note:
          formattedResults.length === 0
            ? "No exact matches found. Try refining your search."
            : undefined,
      });
    } catch (error) {
      // Check if this was an abort error (which we can ignore)
      if (error.name === "AbortError") {
        console.log(`Search for minifig ${searchTerm} was aborted`);
        return this.successResponse({
          aborted: true,
          results: [],
        });
      }

      console.error("Error searching minifigs:", error);
      return this.errorResponse(
        `Failed to search minifigs: ${error.message}`,
        500
      );
    }
  }

  /**
   * Search for minifigs by ID
   *
   * @param {string} searchTerm - ID to search for
   * @param {AbortSignal} signal - Signal for aborting the request
   * @returns {Promise<Array>} Array of minifig results
   */
  async searchMinifigById(searchTerm, signal) {
    // First check if the term is a valid Rebrickable ID
    if (searchTerm.startsWith("fig-")) {
      try {
        const minifig = await externalApiService.fetchMinifigDetails(
          searchTerm
        );
        if (minifig) {
          return [minifig];
        }
      } catch (error) {
        console.log(
          `No direct match found for ${searchTerm}, trying suggestion API`
        );
      }
    }

    // If no direct match, try suggestions
    const suggestUrl = `https://rebrickable.com/search/suggest/?q=${searchTerm}`;
    const suggestRes = await fetch(suggestUrl, {
      signal,
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Content-Type": "application/json",
      },
    });

    if (!suggestRes.ok) {
      throw new Error("Failed to fetch suggestion");
    }

    const suggestData = await suggestRes.json();

    // Map returned IDs to check if they are valid rebrickable minifig IDs
    const rebrickableIdRegex = /^[a-z]{2,3}-\d{1,6}$/i;
    const searchedIds = suggestData
      .map((item) => item.id)
      .filter((id) => rebrickableIdRegex.test(id));

    if (!searchedIds.length) {
      return [];
    }

    const MAX_BATCHES = 2;
    const BATCH_SIZE = 5;
    const DELAY_MS = 2000;

    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const limitedIds = searchedIds.slice(0, MAX_BATCHES * BATCH_SIZE);
    const allResults = [];

    for (let batchIndex = 0; batchIndex < MAX_BATCHES; batchIndex++) {
      const batchStart = batchIndex * BATCH_SIZE;
      const batchIds = limitedIds.slice(batchStart, batchStart + BATCH_SIZE);

      if (batchIds.length === 0) break;

      const batchFetches = batchIds.map(
        (id) =>
          externalApiService
            .fetchMinifigDetails(id)
            .then((result) => result)
            .catch((err) => null) // Silently skip errors
      );

      const batchResults = await Promise.all(batchFetches);
      allResults.push(...batchResults.filter(Boolean));

      if (batchIndex < MAX_BATCHES - 1) {
        await delay(DELAY_MS); // Wait before the next batch
      }
    }

    return allResults;
  }
}

export default new SearchController();
