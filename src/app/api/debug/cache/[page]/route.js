// src/app/api/debug/cache/[page]/route.js

import { BrickMetadata } from "@/lib/Mongo/Schema";
import dbConnect from "@/lib/Mongo/Mongo";

/**
 * Debug endpoint to validate cache data against real data from Rebrickable API
 * Specifically checks if (metadata).availableColors matches (API).availableColors
 * and detects incomplete caches
 *
 * @param {Request} req - The request object
 * @param {Object} params - Route parameters containing page parameter
 * @returns {Response} JSON response with validation results
 */
export async function GET(_req, { params }) {
  const startTime = Date.now();
  console.log(`Starting debug cache check...`);

  try {
    const parsedParam = await params;
    const page = parsedParam.page || "1";
    const pageNumber = parseInt(page) || 1;
    const pageSize = 250;
    const skip = (pageNumber - 1) * pageSize;

    console.log(`Processing page ${pageNumber} with page size ${pageSize}`);

    // Initialize results object
    const results = {
      summary: {
        pageNumber,
        pageSize,
        totalChecked: 0,
        discrepanciesFound: 0,
        incompleteFound: 0,
        processingTimeMs: 0,
        startTime: new Date().toISOString(),
      },
      availableColorsCheck: {
        status: null,
        message: null,
        data: [],
      },
      cacheIncompleteCheck: {
        status: null,
        message: null,
        data: [],
      },
    };

    // Connect to database
    console.log(`Connecting to database...`);
    await dbConnect();
    console.log(`Database connected`);

    // Fetch potentially corrupt cache entries (single color entries) for checking
    console.log(
      `Fetching potentially corrupt cache entries (single color entries)...`
    );
    const potentiallyCorruptEntries = await fetchPotentiallyCorruptEntries(
      pageSize,
      skip
    );
    console.log(
      `Found ${
        potentiallyCorruptEntries?.length || 0
      } potentially corrupt entries`
    );

    if (!potentiallyCorruptEntries || potentiallyCorruptEntries.length === 0) {
      results.availableColorsCheck.status = "empty";
      results.availableColorsCheck.message = `No potential corrupt cache entries found on page ${pageNumber}`;
      console.log(results.availableColorsCheck.message);
    } else {
      // Process and verify potentially corrupt entries
      console.log(`Starting verification of potentially corrupt entries...`);
      const colorCheckResults = await verifyAvailableColors(
        potentiallyCorruptEntries
      );
      results.availableColorsCheck = colorCheckResults;
      results.summary.totalChecked += potentiallyCorruptEntries.length;

      const discrepanciesCount = colorCheckResults.data.filter(
        (item) => item.isDiscrepancy
      ).length;
      results.summary.discrepanciesFound += discrepanciesCount;

      console.log(
        `Verification complete: ${discrepanciesCount} discrepancies found out of ${potentiallyCorruptEntries.length} entries`
      );
    }

    // Check for incomplete cache entries
    console.log(`Checking for entries marked as having incomplete cache...`);
    const incompleteEntries = await fetchIncompleteEntries();
    console.log(
      `Found ${incompleteEntries?.length || 0} incomplete cache entries`
    );

    if (!incompleteEntries || incompleteEntries.length === 0) {
      results.cacheIncompleteCheck.status = "ok";
      results.cacheIncompleteCheck.message =
        "No incomplete cache entries found";
      console.log(results.cacheIncompleteCheck.message);
    } else {
      results.cacheIncompleteCheck.status = "warning";
      results.cacheIncompleteCheck.message = `Found ${incompleteEntries.length} incomplete cache entries`;
      results.cacheIncompleteCheck.data =
        formatIncompleteEntries(incompleteEntries);
      results.summary.incompleteFound = incompleteEntries.length;
      console.log(results.cacheIncompleteCheck.message);
    }

    // Calculate total processing time
    const endTime = Date.now();
    results.summary.processingTimeMs = endTime - startTime;
    console.log(`Total processing time: ${results.summary.processingTimeMs}ms`);

    // Generate summary message
    console.log(
      `Summary: Checked ${results.summary.totalChecked} entries, ` +
        `found ${results.summary.discrepanciesFound} discrepancies and ` +
        `${results.summary.incompleteFound} incomplete entries`
    );

    return Response.json({ results }, { status: 200 });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(
      `Error in debug cache route after ${processingTime}ms:`,
      error
    );
    return Response.json(
      {
        error: error.message || "An error occurred",
        processingTimeMs: processingTime,
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch entries from the database that could potentially have corrupt cache
 * Looks for entries with exactly one color (might be missing other colors)
 *
 * @param {number} limit - Maximum number of entries to fetch
 * @param {number} skip - Number of entries to skip for pagination
 * @returns {Promise<Array>} Array of potentially corrupt cache entries
 */
async function fetchPotentiallyCorruptEntries(limit, skip) {
  try {
    console.log(
      `Querying database for potentially corrupt entries (limit: ${limit}, skip: ${skip})...`
    );
    const queryStart = Date.now();

    const entries = await BrickMetadata.find(
      {
        invalid: false,
        availableColors: { $exists: true, $ne: [] },
        $expr: { $lt: [{ $size: "$availableColors" }, 5] },
      },
      { _id: 0, __v: 0, "availableColors._id": 0 }
    )
      .limit(limit)
      .skip(skip)
      .lean();

    const queryTime = Date.now() - queryStart;
    console.log(
      `Query completed in ${queryTime}ms, found ${entries.length} entries`
    );

    if (entries.length > 0) {
      console.log(
        `Sample entry: elementId=${entries[0].elementId}, elementName=${entries[0].elementName}`
      );
    }

    return entries;
  } catch (error) {
    console.error("Error fetching potentially corrupt entries:", error);
    return [];
  }
}

/**
 * Fetch entries marked as having incomplete cache
 *
 * @returns {Promise<Array>} Array of incomplete cache entries
 */
async function fetchIncompleteEntries() {
  try {
    console.log(
      `Querying database for entries marked as having incomplete cache...`
    );
    const queryStart = Date.now();

    const entries = await BrickMetadata.find(
      {
        cacheIncomplete: true,
        invalid: false,
      },
      { _id: 0, __v: 0, "availableColors._id": 0 }
    ).lean();

    const queryTime = Date.now() - queryStart;
    console.log(
      `Query completed in ${queryTime}ms, found ${entries.length} entries`
    );

    if (entries.length > 0) {
      console.log(
        `Sample incomplete entry: elementId=${entries[0].elementId}, elementName=${entries[0].elementName}`
      );
    }

    return entries;
  } catch (error) {
    console.error("Error fetching incomplete entries:", error);
    return [];
  }
}

/**
 * Format the incomplete cache entries for the response
 *
 * @param {Array} entries - Array of incomplete cache entries
 * @returns {Array} Formatted incomplete entries
 */
function formatIncompleteEntries(entries) {
  return entries.map((entry) => ({
    elementId: entry.elementId,
    elementName: entry.elementName,
    expected: ["Colors from API (incomplete)"],
    got: formatColorList(entry.availableColors || []),
    isIncomplete: true,
    issue: "Cache is marked as incomplete",
  }));
}

/**
 * Format a list of colors for display
 *
 * @param {Array} colors - Array of color objects
 * @returns {Array} Formatted list of colors
 */
function formatColorList(colors) {
  return colors.map((color) => `Color ${color.color} (ID: ${color.colorId})`);
}

/**
 * Verifies if the cached available colors match the real data from Rebrickable
 *
 * @param {Array} entries - Array of cache entries to verify
 * @returns {Object} Object containing verification results
 */
async function verifyAvailableColors(entries) {
  const results = {
    status: "ok",
    message: "No discrepancies found",
    data: [],
    rateLimits: {
      encountered: false,
      count: 0,
    },
  };

  console.log(
    `Starting verification of ${entries.length} entries with rate-limit aware processing...`
  );

  // Process entries with rate limit awareness
  const { verificationResults, rateLimited } = await processBatches(
    entries,
    verifyEntry
  );

  // Add results to the response
  results.data = verificationResults;

  // Count how many results were affected by rate limiting
  const rateLimitedResults = verificationResults.filter(
    (result) => result.rateLimited
  );
  results.rateLimits.encountered = rateLimited;
  results.rateLimits.count = rateLimitedResults.length;

  // Update status if discrepancies found
  const discrepancies = verificationResults.filter(
    (result) => result.isDiscrepancy
  );
  if (discrepancies.length > 0) {
    results.status = "warning";
    results.message = `Found ${discrepancies.length} entries with discrepancies`;
  }

  if (rateLimited) {
    results.message += ` (${rateLimitedResults.length} requests were rate limited)`;
  }

  return results;
}

/**
 * Verify a single entry against the Rebrickable API
 *
 * @param {Object} entry - Cache entry to verify
 * @returns {Object} Verification result
 */
async function verifyEntry(entry) {
  try {
    const {
      elementId,
      elementName,
      availableColors: cacheAvailableColors,
    } = entry;

    console.log(`Checking element ${elementId} (${elementName})...`);

    // Fetch real color data from Rebrickable
    const rebrickableData = await fetchColorDataFromRebrickable(elementId);

    // If rate limited
    if (rebrickableData.rateLimited) {
      console.log(`Rate limited on element ${elementId}`);

      return {
        elementId,
        elementName,
        expected: ["Rate limited by Rebrickable API"],
        got: formatColorList(cacheAvailableColors),
        isDiscrepancy: false,
        issue: "Rate limited by Rebrickable API",
        rateLimited: true,
      };
    }

    // If no data found or error occurred
    if (!rebrickableData.data) {
      console.log(`No data returned for element ${elementId}`);

      return {
        elementId,
        elementName,
        expected: ["Failed to fetch data from Rebrickable"],
        got: formatColorList(cacheAvailableColors),
        isDiscrepancy: false,
        issue: "Failed to verify - Rebrickable API error",
      };
    }

    // Format Rebrickable data to match our schema
    const rebrickableAvailableColors = rebrickableData.data.map((color) => ({
      colorId: String(color.color_id),
      color: color.color_name,
      elementImage: color.part_img_url,
    }));

    // Compare cache with Rebrickable data
    const isDiscrepancy = !areColorArraysEqual(
      cacheAvailableColors,
      rebrickableAvailableColors
    );

    // If discrepancy found, analyze differences
    let issue = "No issues found";
    let differences = null;

    if (isDiscrepancy) {
      console.log(`Discrepancy found for element ${elementId}`);
      // Find differences between cache and API data
      differences = findColorDifferences(
        cacheAvailableColors,
        rebrickableAvailableColors
      );
      const discrepancyType = getDiscrepancyType(
        cacheAvailableColors,
        rebrickableAvailableColors
      );

      issue = formatIssueMessage(differences, discrepancyType);
      console.log(`Discrepancy found for element ${elementId}: ${issue}`);
    } else {
      console.log(`No discrepancy for element ${elementId}`);
    }

    return {
      elementId,
      elementName,
      expected: formatColorList(rebrickableAvailableColors),
      got: formatColorList(cacheAvailableColors),
      isDiscrepancy,
      issue,
      details: isDiscrepancy ? { differences } : null,
    };
  } catch (error) {
    console.error(`Error verifying colors for ${entry.elementId}:`, error);
    return {
      elementId: entry.elementId,
      elementName: entry.elementName,
      expected: ["Error during verification"],
      got: formatColorList(entry.availableColors || []),
      isDiscrepancy: false,
      issue: `Error: ${error.message}`,
    };
  }
}

/**
 * Find differences between cache colors and API colors
 *
 * @param {Array} cacheColors - Array of color objects from cache
 * @param {Array} apiColors - Array of color objects from API
 * @returns {Object} Object containing missing, extra, and mismatched colors
 */
function findColorDifferences(cacheColors, apiColors) {
  const cacheColorIds = new Set(cacheColors.map((c) => c.colorId));
  const apiColorIds = new Set(apiColors.map((c) => c.colorId));

  // Find missing colors (in API but not in cache)
  const missing = apiColors.filter(
    (apiColor) => !cacheColorIds.has(apiColor.colorId)
  );

  // Find extra colors (in cache but not in API)
  const extra = cacheColors.filter(
    (cacheColor) => !apiColorIds.has(cacheColor.colorId)
  );

  // Find colors with mismatched data
  const mismatched = [];

  // For colors that exist in both, check if data matches
  cacheColors.forEach((cacheColor) => {
    if (apiColorIds.has(cacheColor.colorId)) {
      const apiColor = apiColors.find((a) => a.colorId === cacheColor.colorId);

      if (
        cacheColor.color !== apiColor.color ||
        cacheColor.elementImage !== apiColor.elementImage
      ) {
        mismatched.push({
          colorId: cacheColor.colorId,
          color: cacheColor.color,
          cache: cacheColor,
          api: apiColor,
        });
      }
    }
  });

  return { missing, extra, mismatched };
}

/**
 * Format an issue message based on the differences found
 *
 * @param {Object} differences - Object containing missing, extra, and mismatched colors
 * @param {string} discrepancyType - Type of discrepancy
 * @returns {string} Formatted issue message
 */
function formatIssueMessage(differences, discrepancyType) {
  if (differences.missing.length > 0) {
    return `Missing colors: ${differences.missing
      .map((c) => c.color)
      .join(", ")}`;
  } else if (differences.extra.length > 0) {
    return `Extra colors in cache: ${differences.extra
      .map((c) => c.color)
      .join(", ")}`;
  } else if (differences.mismatched.length > 0) {
    return `Mismatched data for colors: ${differences.mismatched
      .map((c) => c.color)
      .join(", ")}`;
  }
  return discrepancyType;
}

/**
 * Compare two arrays of color objects for equality
 *
 * @param {Array} cacheColors - Array of color objects from cache
 * @param {Array} apiColors - Array of color objects from API
 * @returns {boolean} True if arrays are equivalent, false otherwise
 */
function areColorArraysEqual(cacheColors, apiColors) {
  // Quick check for array length
  if (cacheColors.length !== apiColors.length) {
    console.log(
      `Arrays have different lengths: cache=${cacheColors.length}, api=${apiColors.length}`
    );
    return false;
  }

  // Sort both arrays by colorId for consistent comparison
  const sortedCache = [...cacheColors].sort((a, b) =>
    String(a.colorId).localeCompare(String(b.colorId))
  );

  const sortedApi = [...apiColors].sort((a, b) =>
    String(a.colorId).localeCompare(String(b.colorId))
  );

  // Compare each color entry
  for (let i = 0; i < sortedCache.length; i++) {
    if (
      sortedCache[i].colorId !== sortedApi[i].colorId ||
      sortedCache[i].color !== sortedApi[i].color ||
      sortedCache[i].elementImage !== sortedApi[i].elementImage
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Determine the type of discrepancy between cache and API data
 *
 * @param {Array} cacheColors - Array of color objects from cache
 * @param {Array} apiColors - Array of color objects from API
 * @returns {string} Description of the discrepancy type
 */
function getDiscrepancyType(cacheColors, apiColors) {
  if (cacheColors.length < apiColors.length) {
    return "missing_colors";
  } else if (cacheColors.length > apiColors.length) {
    return "extra_colors";
  } else {
    return "mismatched_data";
  }
}

/**
 * Fetch color data for a specific LEGO element from Rebrickable API
 *
 * @param {string} elementId - The LEGO element ID
 * @returns {Object} Object containing the API response data
 */
async function fetchColorDataFromRebrickable(elementId) {
  const url = `https://rebrickable.com/api/v3/lego/parts/${elementId}/colors/`;
  console.log(`Fetching colors for element ${elementId}...`);

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    });

    // Handle different response statuses
    if (res.status === 429) {
      // Parse the error response to get the delay if available
      let retryAfter = 5; // Default 5 seconds
      try {
        const errorData = await res.json();
        if (errorData?.detail) {
          const match = errorData.detail.match(
            /Expected available in (\d+) seconds/
          );
          if (match && match[1]) {
            retryAfter = parseInt(match[1]) || 5;
          }
        }
      } catch (parseError) {
        // If we can't parse the response, use the default retry time
      }

      console.warn(
        `Rate limit exceeded for element ${elementId}. API suggests waiting ${retryAfter} seconds.`
      );
      return { data: null, rateLimited: true, retryAfter };
    }

    if (res.status === 404) {
      console.warn(`Part ${elementId} not found in Rebrickable API.`);
      return { data: null, notFound: true };
    }

    if (!res.ok) {
      console.warn(
        `Failed to fetch color data for part ${elementId}: ${res.status} ${res.statusText}`
      );
      return { data: null };
    }

    const data = await res.json();
    console.log(
      `Successfully fetched ${
        data.results?.length || 0
      } colors for part ${elementId}`
    );
    return { data: data.results };
  } catch (err) {
    console.error(`Error fetching color data for part ${elementId}:`, err);
    return { data: null };
  }
}

/**
 * Process entries in batches to avoid overwhelming the Rebrickable API
 * Respects the rate limit of one request per second on average
 *
 * @param {Array} entries - Array of entries to process
 * @param {function} processFn - Function to process each entry
 * @returns {Object} Object containing results and rate limit status
 */
async function processBatches(entries, processFn) {
  // Normal user accounts are allowed to send on average one request/sec
  // with some small allowance for burst traffic
  const REQUEST_DELAY = 1100; // Slightly more than 1 second per request
  const RATE_LIMIT_DELAY = 5000; // 5 seconds when throttled
  const EXTENDED_RATE_LIMIT_DELAY = 120000; // 2 minutes for persistent rate limiting

  let verificationResults = [];
  let wasRateLimited = false;
  let rateLimitCount = 0;

  console.log(
    `Processing ${entries.length} entries with rate limit of ~1 request/second...`
  );

  // Process entries one at a time with proper delays to respect rate limits
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    console.log(
      `Processing entry ${i + 1}/${entries.length}: ${entry.elementId}...`
    );

    try {
      // Process the entry
      const result = await processFn(entry);
      verificationResults.push(result);

      // Check if rate limited
      if (result.rateLimited) {
        rateLimitCount++;
        wasRateLimited = true;

        // Determine delay based on how often we're being rate limited
        let delay = RATE_LIMIT_DELAY;
        if (rateLimitCount > 3) {
          delay = EXTENDED_RATE_LIMIT_DELAY;
          console.log(
            `Repeatedly rate limited. Taking a long break (${
              delay / 1000
            } seconds)...`
          );
          rateLimitCount = 0; // Reset after taking a long break
        } else {
          console.log(
            `Rate limited. Waiting ${delay / 1000} seconds before continuing...`
          );
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // Not rate limited, add standard delay between requests
        if (i < entries.length - 1) {
          // Don't wait after the last entry
          await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
        }
      }
    } catch (error) {
      console.error(
        `Error processing entry ${i + 1}/${entries.length}:`,
        error
      );
      verificationResults.push({
        elementId: entry.elementId,
        elementName: entry.elementName,
        expected: ["Error during processing"],
        got: formatColorList(entry.availableColors || []),
        isDiscrepancy: false,
        issue: `Error: ${error.message}`,
      });

      // Add delay even on error
      if (i < entries.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
      }
    }
  }

  return { verificationResults, rateLimited: wasRateLimited };
}
