// src/app/lib/API/client/clientFetchUtils.js

/**
 * Client-side fetch with retry functionality (without sensitive data)
 *
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export async function clientFetchWithRetry(
  url,
  options = {},
  retryOptions = {}
) {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 8000,
    onRetry = null,
  } = retryOptions;

  let attempts = 0;
  let lastError = null;

  while (attempts <= retries) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort("timeout"), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle rate limiting without server-side logic
      if (response.status === 429 && attempts < retries) {
        const retryAfter = response.headers.get("Retry-After");
        const delay = retryAfter
          ? parseInt(retryAfter) * 1000
          : retryDelay * Math.pow(2, attempts);

        attempts++;
        lastError = new Error(`Rate limited, retrying in ${delay}ms`);

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

      if (attempts > retries || error.name === "AbortError") {
        throw error;
      }

      const delay = retryDelay * Math.pow(2, attempts - 1);
      if (onRetry) {
        onRetry(attempts, delay, error);
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Client-side fetch JSON with retry
 *
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function clientFetchJSON(url, options = {}, retryOptions = {}) {
  const response = await clientFetchWithRetry(url, options, retryOptions);

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`Error ${response.status}: ${errorText}`);
  }

  return response.json();
}
