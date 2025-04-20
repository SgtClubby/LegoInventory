// src/app/lib/API/Middleware/ApiVersionMiddleware.js

import apiVersionManager from "../Router/ApiVersionManager";
import { errorResponse } from "../ApiHelpers";
import initV1Api from "../Router/initV1Api";

// Initialize API versions
let initialized = false;

/**
 * Middleware to handle API versioning
 *
 * @param {Function} handler - The next handler in the middleware chain
 * @returns {Function} - The middleware handler
 */
export function withApiVersioning(handler) {
  // Initialize API versions if not already done
  if (!initialized) {
    initV1Api();
    initialized = true;
  }

  return async (req, context) => {
    try {
      // Parse API version from path
      const path = new URL(req.url).pathname;
      const version = apiVersionManager.parseVersionFromPath(path);

      if (!version) {
        // If no version in path, use default handler
        return handler(req, context);
      }

      // Check if this version is supported
      try {
        const router = apiVersionManager.getRouter(version);

        // Extract the path without version prefix
        const versionlessPath = path.replace(`/api/${version}/`, "");

        // Find the appropriate handler
        const method = req.method.toUpperCase();
        const routeHandler = router.findRoute(method, versionlessPath);

        if (routeHandler) {
          // Execute the route handler
          return routeHandler(req, context);
        }

        // No handler found, continue to next middleware
        return handler(req, context);
      } catch (error) {
        console.error(`API version error: ${error.message}`);
        return errorResponse(`Unsupported API version: ${version}`, 400);
      }
    } catch (error) {
      console.error("API versioning middleware error:", error);
      return errorResponse("Internal server error", 500);
    }
  };
}

export default { withApiVersioning };
