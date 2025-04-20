// src/app/lib/API/AppRouterUtils.js

/**
 * Helper function to properly extract and await params from Next.js App Router
 *
 * The issue is that in Next.js App Router, params can sometimes be a Promise
 * that needs to be awaited, and sometimes it's a plain object
 *
 * @param {Object|Promise<Object>} params - Route parameters from App Router
 * @returns {Promise<Object>} Resolved parameters
 */
export async function getRouteParams(params) {
  try {
    // Check if params is a Promise by looking for the then method
    if (params && typeof params.then === "function") {
      return await params;
    }

    // Otherwise just return the params as is
    return params;
  } catch (error) {
    console.error("Error resolving route params:", error);
    return {};
  }
}

/**
 * A higher-order function to wrap API route handlers with proper params handling
 *
 * @param {Function} handler - Original route handler
 * @returns {Function} Wrapped handler with params handling
 */
export function withParamsHandling(handler) {
  return async (req, context) => {
    const resolvedParams = await getRouteParams(context.params);
    return handler(req, { ...context, params: resolvedParams });
  };
}
