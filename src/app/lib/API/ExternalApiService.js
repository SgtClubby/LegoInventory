// src/app/lib/API/ExternalApiService.js

import { fetchRebrickable, fetchWithRetry } from "@/lib/API/FetchUtils";
import apiUrlBuilder from "@/lib/API/ApiUrlBuilder";
import cacheManager from "@/lib/Cache/CacheManager";
import config from "@/lib/Config/config";
import { load } from "cheerio";
import { findBestMatch } from "string-similarity";

/**
 * Service for interacting with external APIs like Rebrickable and Bricklink
 */
class ExternalApiService {
  /**
   * Default User-Agent for external requests
   */
  static USER_AGENT =
    config.userAgent ||
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";

  /**
   * Fetch set details from Rebrickable
   *
   * @param {string} searchTerm - Piece ID
   * @returns {Promise<Array|null>} Array of set details or null
   */
  async searchSets(searchTerm) {
    const data = await fetchRebrickable(
      `sets/?search=${searchTerm}`,
      {},
      {
        retries: 2,
        onRetry: (attempt) =>
          console.log(
            `Retrying set search for ${searchTerm}, attempt ${attempt}`
          ),
      }
    );

    if (!data || !data.results) {
      return null;
    }

    const formattedResults = data.results.map((item) => ({
      setId: item.set_num,
      setName: item.name,
      setImage: item.set_img_url,
      setYear: item.year,
      setParts: item.num_parts,
    }));

    return formattedResults;
  }

  async searchParts(searchTerm) {
    const data = await fetchRebrickable(
      `parts/?search=${searchTerm}`,
      {},
      {
        retries: 2,
        onRetry: (attempt) =>
          console.log(
            `Retrying part search for ${searchTerm}, attempt ${attempt}`
          ),
      }
    );

    if (!data || !data.results) {
      return null;
    }

    const formattedResults = data.results.map((item) => {
      const fliteredNames = ["Duplo", "Modulex"];

      // Filter out items with names that contain any of the filtered names
      if (fliteredNames.some((name) => item.name.includes(name))) {
        return null;
      }

      return {
        elementId: item.part_num,
        elementName: item.name,
        elementImage: item.part_img_url,
      };
    });

    return formattedResults.filter((item) => item != null);
  }

  /**
   * Fetch part details from Rebrickable
   *
   * @param {string} pieceId - Piece ID
   * @returns {Promise<Object|null>} Piece details or null
   */
  async fetchPartDetails(pieceId) {
    try {
      // Check cache first
      const cachedData = await cacheManager.getBrickMetadata(pieceId);
      if (cachedData && !cachedData.cacheIncomplete) {
        return {
          part_num: cachedData.elementId,
          name: cachedData.elementName,
          fromCache: true,
        };
      }

      // Fetch from API if not in cache
      const data = await fetchRebrickable(
        `parts/${pieceId}`,
        {},
        {
          retries: 2,
          onRetry: (attempt) =>
            console.log(
              `Retrying part details fetch for ${pieceId}, attempt ${attempt}`
            ),
        }
      );

      const colorData = await this.fetchPartColors(pieceId);

      // Cache the result for future use
      if (data && data.part_num) {
        await cacheManager.setBrickMetadata({
          elementId: pieceId,
          elementName: data.name || `Part ${pieceId}`, // Placeholder name if not available
          availableColors: colorData || [],
          invalid: false,
          cacheIncomplete: false, // Mark as complete since we have full metadata
        });
      }

      return data;
    } catch (error) {
      console.error(`Error fetching part details for ${pieceId}:`, error);
      return null;
    }
  }

  /**
   * Improved fetchImageForPiece function with better error handling
   *
   * @param {string} pieceId - The part element ID
   * @param {string} colorId - The color ID
   * @returns {Promise<string|null>} The image URL or null if fetch fails
   */
  async fetchImageForPiece(pieceId, colorId) {
    if (!pieceId || colorId === undefined || colorId === null) {
      console.warn("fetchImageForPiece called without valid IDs", {
        pieceId,
        colorId,
      });
      return null;
    }

    try {
      console.log(`Fetching image for part ${pieceId} with color ${colorId}`);
      const data = await fetchRebrickable(
        `parts/${pieceId}/colors/${colorId}/`
      );

      // Make sure we're returning the correct property
      if (data && data.part_img_url) {
        return data.part_img_url;
      } else {
        return null;
      }
    } catch (error) {
      console.error("Error fetching image:", error);
      return null;
    }
  }

  /**
   * Fetch part colors from Rebrickable
   *
   * @param {string} pieceId - Part ID
   * @returns {Promise<Array|null>} Array of colors or null
   */
  async fetchPartColors(pieceId) {
    try {
      // Check cache first
      const cachedData = await cacheManager.getBrickMetadata(pieceId);
      if (cachedData && !cachedData.cacheIncomplete) {
        return cachedData.availableColors;
      }

      // Fetch from API if not in cache
      const data = await fetchRebrickable(
        `parts/${pieceId}/colors/`,
        {},
        {
          retries: 2,
          onRetry: (attempt) =>
            console.log(
              `Retrying colors fetch for ${pieceId}, attempt ${attempt}`
            ),
        }
      );

      if (!data || !data.results) {
        return null;
      }

      // Format results
      const formattedColors = data.results.map((item) => ({
        colorId: item.color_id.toString(),
        color: item.color_name,
        elementImage: item.part_img_url,
      }));

      // Cache the result if we found a cache entry, but cacheIncomplete is true
      if (cachedData) {
        await cacheManager.setBrickMetadata({
          ...cachedData,
          availableColors: formattedColors,
          cacheIncomplete: false,
        });
      } else {
        await cacheManager.setBrickMetadata({
          elementId: pieceId,
          elementName: `Part ${pieceId}`, // Placeholder name
          availableColors: formattedColors,
          invalid: false,
          cacheIncomplete: true, // Mark as incomplete since we don't have full metadata
        });
      }

      return formattedColors;
    } catch (error) {
      console.error(`Error fetching part colors for ${pieceId}:`, error);
      return null;
    }
  }

  /**
   * Fetch minifig details from Rebrickable
   *
   * @param {string} minifigId - Minifig ID (Rebrickable format)
   * @returns {Promise<Object|null>} Minifig details or null
   */
  async fetchMinifigDetails(minifigId) {
    try {
      // Check cache first
      const cachedData = await cacheManager.getMinifigMetadata(minifigId);
      if (cachedData) {
        return {
          set_num: cachedData.minifigIdRebrickable,
          name: cachedData.minifigName,
          set_img_url: cachedData.minifigImage,
          fromCache: true,
          priceData: cachedData.priceData,
        };
      }

      // Fetch from API if not in cache
      const data = await fetchRebrickable(
        `minifigs/${minifigId}/`,
        {},
        {
          retries: 2,
          onRetry: (attempt) =>
            console.log(
              `Retrying minifig details fetch for ${minifigId}, attempt ${attempt}`
            ),
        }
      );

      return data;
    } catch (error) {
      console.error(`Error fetching minifig details for ${minifigId}:`, error);
      return null;
    }
  }

  /**
   * Find Bricklink ID for a Rebrickable minifig
   *
   * @param {string} rebrickableId - Rebrickable minifig ID
   * @param {string} minifigName - Minifig name for matching
   * @returns {Promise<string|null>} Bricklink ID or null
   */
  async findBricklinkIdForMinifig(rebrickableId, minifigName) {
    try {
      // Check if we have cached data
      const cachedData = await cacheManager.getMinifigMetadata(rebrickableId);
      if (cachedData && cachedData.minifigIdBricklink) {
        return cachedData.minifigIdBricklink;
      }

      // If not in cache, need to find it by searching sets containing this minifig
      const setsResponse = await fetchRebrickable(
        `minifigs/${rebrickableId}/sets/`,
        {},
        {
          retries: 1,
        }
      );

      if (
        !setsResponse ||
        !setsResponse.results ||
        setsResponse.results.length === 0
      ) {
        console.log(`No sets found containing minifig ${rebrickableId}`);
        return null;
      }

      // Find a suitable set to check on Bricklink
      function numericPart(s) {
        const [prefix] = s.split("-");
        return /^\d+$/.test(prefix) ? Number(prefix) : NaN;
      }

      const validSets = setsResponse.results.filter(
        (r) => !Number.isNaN(numericPart(r.set_num))
      );
      if (!validSets.length) {
        console.log(
          `No numeric set numbers found for minifig ${rebrickableId}`
        );
        return null;
      }

      // Sort by set number and use the lowest one
      const lowestValid = validSets.reduce((p, c) =>
        numericPart(c.set_num) < numericPart(p.set_num) ? c : p
      );

      const setNumber = lowestValid.set_num;

      // Now fetch the inventory from BrickLink
      const bricklinkUrl = apiUrlBuilder.bricklinkInventory(setNumber);
      const response = await fetchWithRetry(
        bricklinkUrl,
        {
          headers: {
            "User-Agent": ExternalApiService.USER_AGENT,
          },
        },
        {
          retries: 2,
          timeout: 10000,
        }
      );

      if (!response.ok) {
        console.log(`Failed to fetch BrickLink inventory for set ${setNumber}`);
        return null;
      }

      const html = await response.text();

      // Parse HTML to find minifigs
      const $ = load(html);
      const minifigs = [];

      $("table.ta tr.IV_ITEM").each((_, tr) => {
        const bold = $(tr).find("td").eq(3).find("b").text() || "";
        if (!bold) return;

        minifigs.push({
          name: this.normalizeString(bold),
          id: $(tr).find("td").eq(2).find("a").first().text().trim(),
        });
      });

      if (minifigs.length === 0) {
        console.log(`No minifigs found in set ${setNumber}`);
        return null;
      }

      // Find best match for this minifig name
      const searchName = this.normalizeString(minifigName);
      const minifigNames = minifigs.map((m) => m.name);

      const { bestMatchIndex } = findBestMatch(searchName, minifigNames);
      const bricklinkId = minifigs[bestMatchIndex].id;

      // Save the match to cache
      if (cachedData) {
        await cacheManager.setMinifigMetadata({
          ...cachedData,
          minifigIdBricklink: bricklinkId,
        });
      }

      return bricklinkId;
    } catch (error) {
      console.error(`Error finding BrickLink ID for ${rebrickableId}:`, error);
      return null;
    }
  }

  /**
   * Fetch price data for a minifig from BrickLink
   *
   * @param {string} bricklinkId - BrickLink minifig ID
   * @returns {Promise<Object|null>} Price data or null
   */
  async fetchMinifigPriceData(bricklinkId) {
    try {
      // Fetch from BrickLink search API
      const searchUrl = apiUrlBuilder.bricklinkSearch(bricklinkId);
      const response = await fetchWithRetry(
        searchUrl,
        {
          headers: {
            "User-Agent": ExternalApiService.USER_AGENT,
          },
        },
        {
          retries: 2,
          timeout: 10000,
        }
      );

      if (!response.ok) {
        console.log(
          `Failed to fetch BrickLink price data for minifig ${bricklinkId}`
        );
        return null;
      }

      const data = await response.json();
      const bricklinkData = data.result?.typeList?.[0]?.items?.[0];

      if (!bricklinkData) {
        console.log(`No BrickLink data found for minifig ${bricklinkId}`);
        return null;
      }

      // Parse and format the price data
      return {
        minPriceNew: this.stripCurrency(bricklinkData.mNewMinPrice),
        maxPriceNew: this.stripCurrency(bricklinkData.mNewMaxPrice),
        avgPriceNew: this.averageOfMinMax(
          bricklinkData.mNewMinPrice,
          bricklinkData.mNewMaxPrice
        ),
        minPriceUsed: this.stripCurrency(bricklinkData.mUsedMinPrice),
        maxPriceUsed: this.stripCurrency(bricklinkData.mUsedMaxPrice),
        avgPriceUsed: this.averageOfMinMax(
          bricklinkData.mUsedMinPrice,
          bricklinkData.mUsedMaxPrice
        ),
        currencyCode: "USD",
        currencySymbol: "$",
      };
    } catch (error) {
      console.error(`Error fetching price data for ${bricklinkId}:`, error);
      return null;
    }
  }

  /**
   * Fetch set details from Rebrickable
   *
   * @param {string} setId - Set ID (e.g., "75192-1")
   * @returns {Promise<Object|null>} Set details or null
   */
  async fetchSetDetails(setId) {
    try {
      return await fetchRebrickable(
        `sets/${setId}/`,
        {},
        {
          retries: 2,
        }
      );
    } catch (error) {
      console.error(`Error fetching set details for ${setId}:`, error);
      return null;
    }
  }

  /**
   * Fetch all parts in a set from Rebrickable
   *
   * @param {string} setId - Set ID
   * @returns {Promise<Array|null>} Array of parts or null
   */
  async fetchSetParts(setId) {
    try {
      let allParts = [];
      let nextUrl = `sets/${setId}/parts?page_size=1000`;

      while (nextUrl) {
        const data = await fetchRebrickable(
          nextUrl,
          {},
          {
            retries: 2,
          }
        );

        if (!data || !data.results) {
          break;
        }

        // Filter out spare parts
        const validParts = data.results.filter((part) => !part.is_spare);
        allParts = [...allParts, ...validParts];

        // Check if there are more pages
        nextUrl = data.next
          ? data.next.replace(apiUrlBuilder.rebrickable(""), "")
          : null;
      }

      return allParts;
    } catch (error) {
      console.error(`Error fetching set parts for ${setId}:`, error);
      return null;
    }
  }

  /**
   * Normalize a string for comparison
   *
   * @param {string} str - String to normalize
   * @returns {string} Normalized string
   */
  normalizeString(str) {
    return str
      .trim()
      .toLowerCase()
      .replace(/\s*-\s*/g, "-")
      .replace(/[^a-z0-9-\s]/g, "")
      .replace(/\s+/g, " ");
  }

  /**
   * Strip currency symbols from a string
   *
   * @param {string} str - String with currency symbols
   * @returns {number} Numeric value
   */
  stripCurrency(str) {
    if (!str) return null;
    const clean = str.replace(/[^0-9.-]+/g, "");
    const value = parseFloat(clean);
    return isNaN(value) ? null : value;
  }

  /**
   * Calculate the average of min and max prices
   *
   * @param {string} min - Min price string
   * @param {string} max - Max price string
   * @returns {number|null} Average price or null
   */
  averageOfMinMax(min, max) {
    const minValue = this.stripCurrency(min);
    const maxValue = this.stripCurrency(max);

    if (minValue === null || maxValue === null) {
      return null;
    }

    const avg = (minValue + maxValue) / 2;
    return parseFloat(avg.toFixed(2));
  }
}

// Export a singleton instance
const externalApiService = new ExternalApiService();
export default externalApiService;
