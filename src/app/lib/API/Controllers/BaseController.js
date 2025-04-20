// src/app/lib/API/Controllers/BaseController.js

import { errorResponse, successResponse } from "@/lib/API/ApiHelpers";

/**
 * Base controller class that all API controllers should extend
 * Provides common functionality for handling requests and responses
 */
class BaseController {
  /**
   * Create a new controller instance
   *
   * @param {string} name - Controller name for logging
   */
  constructor(name = "BaseController") {
    this.controllerName = name;
  }

  /**
   * Wraps an async handler function with standard error handling
   *
   * @param {Function} handler - Async function to handle the request
   * @returns {Function} Wrapped handler function
   */
  withErrorHandling(handler) {
    return async (req, params) => {
      try {
        return await handler(req, params);
      } catch (error) {
        console.error(`[${this.controllerName}] Error:`, error);
        return errorResponse(error.message || "Internal server error", 500);
      }
    };
  }

  /**
   * Gets owner ID from request headers with fallback to default
   *
   * @param {Request} req - The request object
   * @returns {string} Owner ID
   */
  getOwnerId(req) {
    return req.headers.get("ownerId") || "default";
  }

  /**
   * Creates a standardized success response
   *
   * @param {Object} data - Response data
   * @param {string} message - Success message
   * @returns {Response} Success response
   */
  successResponse(data = {}, message = "Operation successful") {
    return successResponse(data, message);
  }

  /**
   * Creates a standardized error response
   *
   * @param {string} message - Error message
   * @param {number} status - HTTP status code
   * @returns {Response} Error response
   */
  errorResponse(message, status = 400) {
    return errorResponse(message, status);
  }

  /**
   * Extracts and validates route parameters
   *
   * @param {Object} params - Route parameters
   * @returns {Promise<Object>} Resolved parameters
   */
  async getParams(params) {
    try {
      // Handle the params object which might be a Promise
      const resolvedParams = await params;
      return resolvedParams;
    } catch (error) {
      console.error(`[${this.controllerName}] Error extracting params:`, error);
      return {};
    }
  }
}

export default BaseController;
