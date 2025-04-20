// src/app/lib/API/RateLimiter.js

/**
 * A utility to manage API rate limiting for external services
 * particularly useful for the Rebrickable API which has strict rate limits
 */
class RateLimiter {
  constructor(requestsPerSecond = 1, burstSize = 5) {
    this.requestsPerSecond = requestsPerSecond;
    this.burstSize = burstSize;
    this.tokens = burstSize;
    this.lastRefillTime = Date.now();
    this.pendingRequests = [];
    this.processing = false;
  }

  /**
   * Refills tokens based on time elapsed
   * @private
   */
  _refillTokens() {
    const now = Date.now();
    const timePassed = now - this.lastRefillTime;
    const newTokens = Math.floor(timePassed * (this.requestsPerSecond / 1000));

    if (newTokens > 0) {
      this.tokens = Math.min(this.tokens + newTokens, this.burstSize);
      this.lastRefillTime = now;
    }
  }

  /**
   * Process the queue of pending requests
   * @private
   */
  async _processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.pendingRequests.length > 0) {
      this._refillTokens();

      if (this.tokens < 1) {
        // Calculate wait time until next token is available
        const waitTime = Math.ceil(1000 / this.requestsPerSecond);
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        continue;
      }

      // We have tokens available, process the next request
      const nextRequest = this.pendingRequests.shift();
      this.tokens -= 1;

      try {
        const result = await nextRequest.fn();
        nextRequest.resolve(result);
      } catch (error) {
        nextRequest.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Enqueues a function to be executed with rate limiting
   * @param {Function} fn - The function to execute (should return a Promise)
   * @returns {Promise} A promise that resolves with the result of fn
   */
  async enqueue(fn) {
    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ fn, resolve, reject });
      this._processQueue();
    });
  }

  /**
   * Executes a fetch request with rate limiting
   * @param {string} url - The URL to fetch
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} The fetch response
   */
  async fetch(url, options = {}) {
    return this.enqueue(() => fetch(url, options));
  }
}

// Create a singleton instance for Rebrickable API
const rebrickableRateLimiter = new RateLimiter(1, 5); // 1 request per second, burst of 5

export default rebrickableRateLimiter;
