// src/app/api/bricklink/route.js

import { MinifigMetadata, MinifigPriceMetadata } from "@/lib/Mongo/Schema";
import { load } from "cheerio";
import { findBestMatch } from "string-similarity";

/**
 * Default User-Agent header to use for external requests
 */
const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3";

/**
 * Normalizes a string by trimming, lowercasing, and removing special characters
 *
 * @param {string} str - The string to normalize
 * @returns {string} Normalized string
 */
function normalize(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\s*-\s*/g, "-")
    .replace(/[^a-z0-9-\s]/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Strips currency symbols from a string and converts to a float
 *
 * @param {string} str - String with currency formatting
 * @returns {number} Parsed float value
 */
function stripCurrency(str) {
  const clean = str.replace(/[^0-9.-]+/g, "");
  return parseFloat(clean);
}

/**
 * Calculates the average of min and max price values
 *
 * @param {string} min - Minimum price with currency symbol
 * @param {string} max - Maximum price with currency symbol
 * @returns {number} Average of the two prices
 */
function averageOfMinMax(min, max) {
  const a = stripCurrency(min);
  const b = stripCurrency(max);
  return Number.isFinite(a) && Number.isFinite(b) ? (a + b) / 2 : null;
}

/**
 * Creates a JSON response with appropriate status
 *
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response} JSON response object
 */
function jsonResponse(data, status = 200) {
  return Response.json(data, { status });
}

/**
 * Creates an error response with given message and status
 *
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response} JSON error response
 */
function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

/**
 * Creates an error response with given message and status
 *
 * @param {string} url - URL to fetch
 * @param {RequestInit} [opts={}] - Fetch options
 * @param {number} [ms=5000] - Timeout in milliseconds
 * @returns {Promise<Response>} Fetch response
 */

async function fetchWithTimeout(url, opts = {}, ms = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Handles GET requests to fetch Bricklink data for a minifig
 *
 * @param {Request} request - NextJS request object
 * @returns {Response} JSON response with minifig data or error
 */
export async function POST(request) {
  try {
    const body = await request.json();

    if (!body) {
      return errorResponse("No body provided", 400);
    }

    const { minifigIdRebrickable, minifigName, minifigImage } = body;

    // Validate required parameters
    if (!minifigIdRebrickable || !minifigName) {
      return errorResponse("Missing minifigIdRebrickable or minifigName", 400);
    }

    const existingMinifigCache = await MinifigMetadata.findOne({
      minifigIdRebrickable: minifigIdRebrickable,
    });

    if (existingMinifigCache) {
      console.log(
        "HIT! Cache hit for minifigIdRebrickable:",
        minifigIdRebrickable
      );

      const existingPriceDataCache = await MinifigPriceMetadata.findOne(
        {
          minifigIdRebrickable: minifigIdRebrickable,
        },
        { minifigIdRebrickable: 0 }
      );

      const cleanDecimal = (decimal) => {
        if (decimal && typeof decimal.toString === "function") {
          return parseFloat(decimal.toString());
        }
        return decimal;
      };

      console.log(existingPriceDataCache);

      const { priceData } = existingPriceDataCache;

      const parsedPriceData = Object.fromEntries(
        Object.entries(priceData).map(([key, value]) => {
          if (
            value &&
            typeof value === "object" &&
            typeof value.toString === "function"
          ) {
            return [key, cleanDecimal(value)];
          }
          return [key, value];
        })
      );

      console.log(parsedPriceData);

      const cacheResult = {
        minifigIdBricklink: existingMinifigCache.minifigIdBricklink,
        minifigName: existingMinifigCache.minifigName,
        priceData: parsedPriceData || {
          currencyCode: "USD",
          currencySymbol: "$",
          minPriceNew: "N/A",
          maxPriceNew: "N/A",
          avgPriceNew: "N/A",
          minPriceUsed: "N/A",
          maxPriceUsed: "N/A",
          avgPriceUsed: "N/A",
        },
      };
      return jsonResponse(cacheResult);
    }

    // Fetch sets from Rebrickable API
    const setsRes = await fetch(
      `https://rebrickable.com/api/v3/lego/minifigs/${minifigIdRebrickable}/sets/`,
      {
        headers: {
          Authorization: `key ${process.env.REBRICKABLE_APIKEY}`,
          "User-Agent":
            "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
        },
      }
    );

    if (!setsRes.ok) {
      return errorResponse("Failed to fetch Rebrickable data", setsRes.status);
    }

    const { results } = await setsRes.json();

    // Find the appropriate set containing this minifig
    function numericPart(s) {
      const [prefix] = s.split("-");
      return /^\d+$/.test(prefix) ? Number(prefix) : NaN;
    }

    const validSets = results.filter(
      (r) => !Number.isNaN(numericPart(r.set_num))
    );
    if (!validSets.length) {
      // either error out or fall back:
      // e.g. const lowestValid = results.sort((a,b) => a.set_num.localeCompare(b.set_num))[0];
      return errorResponse("No numeric set numbers found", 404);
    }

    const lowestValid = validSets.reduce((p, c) =>
      numericPart(c.set_num) < numericPart(p.set_num) ? c : p
    );

    const setNumber = lowestValid.set_num;

    if (!setNumber) {
      return errorResponse("No valid set found for this minifig", 404);
    }

    // Fetch set inventory from BrickLink
    const bricklinkUrl = `https://www.bricklink.com/catalogItemInv.asp?S=${encodeURIComponent(
      setNumber
    )}&viewItemType=M`;

    const blRes = await fetchWithTimeout(bricklinkUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
    });

    if (!blRes.ok) {
      return errorResponse("Failed to fetch BrickLink data", blRes.status);
    }

    const html = await blRes.text();

    // Parse HTML to extract minifig IDs
    const $ = load(html);
    const rows = [];

    $("table.ta tr.IV_ITEM").each((_, tr) => {
      const bold = $(tr).find("td").eq(3).find("b").text() || "";
      if (!bold) {
        return;
      }
      rows.push({
        toFind: normalize(bold),
        id: $(tr).find("td").eq(2).find("a").first().text().trim(),
      });
    });

    // Find best match for the minifig name
    const search = normalize(minifigName.replace(/\+/g, " "));
    const toFind = rows.map((r) => r.toFind);

    if (toFind.length === 0) {
      return errorResponse("No minifigs found in this set", 404);
    }

    const { bestMatchIndex } = findBestMatch(search, toFind);
    const bricklinkMinifigId = rows[bestMatchIndex].id;

    if (!bricklinkMinifigId) {
      return errorResponse("Minifig not found in set inventory", 404);
    }

    // Fetch minifig data from BrickLink
    const searchUrl = `https://www.bricklink.com/ajax/clone/search/searchproduct.ajax?q=${encodeURIComponent(
      bricklinkMinifigId
    )}&st=0&cond=&type=M&cat=&yf=0&yt=0&loc=&reg=0&ca=0&ss=&pmt=&nmp=0&color=-1&min=0&max=0&minqty=0&nosuperlot=1&incomplete=0&showempty=1&rpp=25&pi=1&ci=0`;

    const res = await fetchWithTimeout(searchUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
      },
    });

    if (!res.ok) {
      console.log("Fetch NOT OK!");
      return errorResponse("Failed to fetch BrickLink Data", res.status);
    }

    const data = await res.json();
    const bricklinkData = data.result.typeList[0]?.items[0];

    if (!bricklinkData) {
      console.log("No BrickLink data found");
      return errorResponse("No data found", 404);
    }

    // Parse and format the new price data
    const rawAvgNew = averageOfMinMax(
      bricklinkData.mNewMinPrice,
      bricklinkData.mNewMaxPrice
    );
    const avgPriceNew =
      rawAvgNew === null ? null : parseFloat(rawAvgNew.toFixed(2));

    // Parse and format the used price data
    const rawAvgUsed = averageOfMinMax(
      bricklinkData.mUsedMinPrice,
      bricklinkData.mUsedMaxPrice
    );
    const avgPriceUsed =
      rawAvgUsed === null ? null : parseFloat(rawAvgUsed.toFixed(2));

    // Structure the result
    const result = {
      minifigIdBricklink: bricklinkData.strItemNo,
      minifigName: bricklinkData.strItemName,
      priceData: {
        currencyCode: "USD",
        currencySymbol: "$",
        minPriceNew: stripCurrency(bricklinkData.mNewMinPrice),
        maxPriceNew: stripCurrency(bricklinkData.mNewMaxPrice),
        avgPriceNew: parseFloat(avgPriceNew),
        minPriceUsed: stripCurrency(bricklinkData.mUsedMinPrice),
        maxPriceUsed: stripCurrency(bricklinkData.mUsedMaxPrice),
        avgPriceUsed: parseFloat(avgPriceUsed),
      },
    };

    // Save the minifig data to the database
    await MinifigMetadata.create({
      minifigIdRebrickable: minifigIdRebrickable,
      minifigIdBricklink: result.minifigIdBricklink,
      minifigImage,
      minifigName: result.minifigName,
    });

    await MinifigPriceMetadata.create({
      minifigIdRebrickable: minifigIdRebrickable,
      priceData: result.priceData,
    });

    return jsonResponse(result);
  } catch (error) {
    console.error("Error fetching BrickLink minifig ID:", error);
    return errorResponse("Internal server error", 500);
  }
}
