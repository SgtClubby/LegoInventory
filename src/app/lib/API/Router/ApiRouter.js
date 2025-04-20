// src/app/lib/API/Router/ApiRouter.js

/**
 * Router class to handle API route registration and dispatching
 */
class ApiRouter {
  constructor() {
    this.routes = new Map();
    this.controllers = new Map();
  }

  /**
   * Register a controller with the router
   *
   * @param {string} prefix - URL prefix for the controller
   * @param {Object} controller - Controller instance
   */
  registerController(prefix, controller) {
    this.controllers.set(prefix, controller);
  }

  /**
   * Register a route handler
   *
   * @param {string} method - HTTP method (GET, POST, etc.)
   * @param {string} path - Route path
   * @param {Function} handler - Handler function
   */
  register(method, path, handler) {
    const key = `${method.toUpperCase()}:${path}`;
    this.routes.set(key, handler);
  }

  /**
   * Find a matching route for the request
   *
   * @param {string} method - HTTP method
   * @param {string} path - Request path
   * @returns {Function|null} Handler function or null if not found
   */
  findRoute(method, path) {
    const key = `${method.toUpperCase()}:${path}`;
    return this.routes.get(key) || null;
  }

  /**
   * Create route handlers for a controller
   * Useful when setting up Next.js App Router routes
   *
   * @param {Object} controller - Controller with handler methods
   * @returns {Object} Object with route handlers (GET, POST, etc.)
   */
  createRouteHandlers(controller) {
    const handlers = {};

    // For each HTTP method, create a handler if the controller supports it
    ["GET", "POST", "PUT", "PATCH", "DELETE"].forEach((method) => {
      if (typeof controller[method.toLowerCase()] === "function") {
        handlers[method] = controller.withErrorHandling(
          controller[method.toLowerCase()].bind(controller)
        );
      }
    });

    return handlers;
  }
}

// Export singleton instance
const apiRouter = new ApiRouter();
export default apiRouter;
