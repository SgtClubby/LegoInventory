// src/app/lib/API/FetchUtils.js

import rebrickableRateLimiter from "@/lib/API/RateLimiter";

/**
 * Options for fetch with retry functionality
 * @typedef {Object} FetchOptions
 * @property {number} [retries=3] - Maximum number of retry attempts
 * @property {number} [retryDelay=1000] - Delay between retries in milliseconds
 * @property {boolean} [useRateLimiter=false] - Whether to use rate limiter
 * @property {boolean} [rateLimitedRetry=true] - Whether to retry on rate limit (429)
 * @property {number} [timeout=8000] - Request timeout in milliseconds
 * @property {function} [onRetry] - Callback function called on retry
 */

/**
 * Enhanced fetch with retry capability, timeout, and rate limiting
 *
 * @param {string} url - URL to fetch
 * @param {Object} options - Standard fetch options
 * @param {FetchOptions} retryOptions - Options for retry behavior
 * @returns {Promise<Response>} - Fetch response
 */
export async function fetchWithRetry(url, options = {}, retryOptions = {}) {
  const {
    retries = 3,
    retryDelay = 1000,
    useRateLimiter = false,
    rateLimitedRetry = true,
    timeout = 8000,
    onRetry = null,
  } = retryOptions;

  let attempts = 0;
  let lastError = null;

  // Add default headers if not provided
  const fetchOptions = {
    ...options,
    headers: {
      "User-Agent":
        "LegoInventoryBot/1.0 (+https://github.com/SgtClubby/LegoInventory)",
      ...options.headers,
    },
  };

  while (attempts <= retries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      let response;

      // Use rate limiter if specified
      if (useRateLimiter) {
        response = await rebrickableRateLimiter.fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });
      } else {
        response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      // Handle rate limiting (429)
      if (response.status === 429 && rateLimitedRetry && attempts < retries) {
        // Try to get retry-after header, or use exponential backoff
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : retryDelay * Math.pow(2, attempts);

        attempts++;
        lastError = new Error(
          `Rate limited (429), retrying in ${delay}ms, attempt ${attempts}/${retries}`
        );
        console.warn(lastError.message);

        if (onRetry) {
          onRetry(attempts, delay, lastError);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      attempts++;
      lastError = error;

      // Don't retry if we've reached max retries or if it's an abort error
      if (attempts > retries || error.name === "AbortError") {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = retryDelay * Math.pow(2, attempts - 1);
      console.warn(
        `Fetch error (${error.message}), retrying in ${delay}ms, attempt ${attempts}/${retries}`
      );

      if (onRetry) {
        onRetry(attempts, delay, error);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Fetch JSON data with retry
 *
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @param {FetchOptions} retryOptions - Retry options
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function fetchJSON(url, options = {}, retryOptions = {}) {
  const response = await fetchWithRetry(url, options, retryOptions);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Error ${response.status}: ${errorText}`);
  }

  return response.json();
}

/**
 * Fetch from Rebrickable API with proper handling of rate limits and authentication
 *
 * @param {string} url - API endpoint URL (can be relative to Rebrickable API base)
 * @param {Object} options - Fetch options
 * @param {FetchOptions} retryOptions - Retry options
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function fetchRebrickable(url, options = {}, retryOptions = {}) {
  // Add authorization header if not present
  const apiKey = process.env.REBRICKABLE_APIKEY;

  if (!apiKey) {
    throw new Error("Rebrickable API key is not configured");
  }

  const headers = {
    Authorization: `key ${apiKey}`,
    ...options.headers,
  };

  // Handle relative or absolute URLs
  const fullUrl = url.startsWith("http")
    ? url
    : `https://rebrickable.com/api/v3/lego/${
        url.startsWith("/") ? url.substring(1) : url
      }`;

  // Use rate limiter by default for Rebrickable API
  const finalRetryOptions = {
    useRateLimiter: true,
    rateLimitedRetry: true,
    ...retryOptions,
  };

  return fetchJSON(fullUrl, { ...options, headers }, finalRetryOptions);
}
