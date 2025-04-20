// src/app/lib/API/ApiHelpers.js

/**
 * Safely extracts parameters from route params
 * Handles NextJS App Router parameter format correctly
 *
 * @param {Object} params - Route parameters object
 * @returns {Object} Extracted parameters
 */
export async function extractParams(params) {
  try {
    // Handle the params object which might be a Promise
    const resolvedParams = await params;

    // Handle parameter format correctly - could be simple object or Promise
    return resolvedParams;
  } catch (error) {
    console.error("Error extracting params:", error);
    return {};
  }
}

/**
 * Creates a standardized JSON response
 *
 * @param {Object} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response} JSON response
 */
export function jsonResponse(data, status = 200) {
  return Response.json(data, { status });
}

/**
 * Creates a standardized error response
 *
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response} Error response
 */
export function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status);
}

/**
 * Creates a standardized success response
 *
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @returns {Response} Success response
 */
export function successResponse(data = {}, message = "Operation successful") {
  return jsonResponse({
    success: true,
    message,
    ...data,
  });
}

/**
 * Gets the owner ID from request headers or uses a default
 *
 * @param {Request} req - Request object
 * @returns {string} Owner ID or default
 */
export function getOwnerId(req) {
  return req.headers.get("ownerId") || "default";
}

/**
 * Handles API errors with consistent error responses
 *
 * @param {Function} handler - API route handler
 * @returns {Function} Wrapped handler with error handling
 */
export function withErrorHandling(handler) {
  return async (req, params) => {
    try {
      return await handler(req, params);
    } catch (error) {
      console.error("API error:", error);
      return errorResponse(error.message || "Internal server error", 500);
    }
  };
}
