// src/app/api/bricklink/route.js

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
  const minPrice = stripCurrency(min);
  const maxPrice = stripCurrency(max);
  return (minPrice + maxPrice) / 2;
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
 * Handles GET requests to fetch Bricklink data for a minifig
 *
 * @param {Request} request - NextJS request object
 * @returns {Response} JSON response with minifig data or error
 */
export async function GET(request) {
  try {
    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const rebrickableId = searchParams.get("rebrickableId");
    const rawName = searchParams.get("minifigName");

    // Validate required parameters
    if (!rebrickableId || !rawName) {
      return errorResponse("Missing rebrickableId or minifigName", 400);
    }

    // Fetch sets from Rebrickable API
    const setsRes = await fetch(
      `https://rebrickable.com/api/v3/lego/minifigs/${rebrickableId}/sets/`,
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
    const rebrickableSet =
      results.length > 1
        ? results.reduce((prev, curr) => {
            if (prev.set_num.includes("-")) {
              return curr.set_num.includes("-") && curr.set_num < prev.set_num
                ? curr
                : prev;
            } else {
              return curr.set_num.includes("-") && curr.set_num < prev.set_num
                ? prev
                : curr;
            }
          })
        : results[0];

    if (!rebrickableSet) {
      return errorResponse("No set found for this minifig", 404);
    }

    const setNumber = rebrickableSet.set_num;

    // Fetch set inventory from BrickLink
    const bricklinkUrl = `https://www.bricklink.com/catalogItemInv.asp?S=${encodeURIComponent(
      setNumber
    )}&viewItemType=M`;

    const blRes = await fetch(bricklinkUrl, {
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
      rows.push({
        toFind: normalize(bold),
        id: $(tr).find("td").eq(2).find("a").first().text().trim(),
      });
    });

    // Find best match for the minifig name
    const minifigName = normalize(decodeURIComponent(rawName));
    const toFind = rows.map((r) => r.toFind);

    const { bestMatchIndex } = findBestMatch(minifigName, toFind);
    const bricklinkMinifigId = rows[bestMatchIndex].id;

    if (!bricklinkMinifigId) {
      return errorResponse("Minifig not found in set inventory", 404);
    }

    // Fetch minifig data from BrickLink
    const searchUrl = `https://www.bricklink.com/ajax/clone/search/searchproduct.ajax?q=${encodeURIComponent(
      bricklinkMinifigId
    )}&st=0&cond=&type=M&cat=&yf=0&yt=0&loc=&reg=0&ca=0&ss=&pmt=&nmp=0&color=-1&min=0&max=0&minqty=0&nosuperlot=1&incomplete=0&showempty=1&rpp=25&pi=1&ci=0`;

    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": DEFAULT_USER_AGENT,
        "Content-Type": "application/json",
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

    // Process and format the response data
    const typeItem = bricklinkData.typeItem === "M" ? "minifig" : "part";

    const avgPriceNew = averageOfMinMax(
      bricklinkData.mNewMinPrice,
      bricklinkData.mNewMaxPrice
    ).toFixed(2);

    const avgPriceUsed = averageOfMinMax(
      bricklinkData.mUsedMinPrice,
      bricklinkData.mUsedMaxPrice
    ).toFixed(2);

    const result = {
      typeItem,
      minifigIdBricklink: bricklinkData.strItemNo,
      minifigName: bricklinkData.strItemName,
      priceData: {
        currency: "USD",
        minPriceNew: stripCurrency(bricklinkData.mNewMinPrice),
        maxPriceNew: stripCurrency(bricklinkData.mNewMaxPrice),
        avgPriceNew: parseFloat(avgPriceNew),
        minPriceUsed: stripCurrency(bricklinkData.mUsedMinPrice),
        maxPriceUsed: stripCurrency(bricklinkData.mUsedMaxPrice),
        avgPriceUsed: parseFloat(avgPriceUsed),
      },
    };

    return jsonResponse(result);
  } catch (error) {
    console.error("Error fetching BrickLink minifig ID:", error);
    return errorResponse("Internal server error", 500);
  }
}
