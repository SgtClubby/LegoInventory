// src/app/lib/API/client/apiFetch.js
import apiUrlBuilder from "../ApiUrlBuilder";
import getCallerInfo from "../../Misc/DebugCaller";
import { clientFetchJSON } from "./clientFetchUtils"; // Use client-safe version

/**
 * Client-side API fetch wrapper
 *
 * @param {string} path - API path
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - API response data
 */
export async function apiFetch(path, options = {}) {
  const debug = getCallerInfo();
  const caller = debug.file.split(")/.").pop();
  const url = apiUrlBuilder.local(path);

  console.log("[API] Who called:", caller);
  console.log("[API] Fetch:", options.method || "GET", url);
  console.log("[API] Fetch Query:", url.split("?")?.[1] || "No query");
  console.log("[API] Fetch Headers:", options.headers || "No headers");
  console.log(
    "[API] Fetch body:",
    options.body ? JSON.parse(options.body) : "No body"
  );

  const result = await clientFetchJSON(url, options);

  if (result.error) {
    console.error("[API] Fetch Error:", result.error);
    throw new Error(result.error);
  }

  console.log(`[API] ${url} Fetched Data:`, result.data);
  return result.data;
}
