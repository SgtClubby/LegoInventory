// src/app/lib/API/Controllers/ControllerFactory.js

// src/app/lib/API/Controllers/ControllerFactory.js

import BaseController from "./BaseController";
import apiRouter from "../Router/ApiRouter";

/**
 * Creates and registers controller instances
 */
class ControllerFactory {
  /**
   * Create and register a new controller
   *
   * @param {string} name - Controller name
   * @param {string} prefix - URL prefix for the controller
   * @param {Object} methods - Object with controller methods
   * @returns {Object} Controller instance
   */
  createController(name, prefix, methods) {
    // Create a controller class extending BaseController
    class Controller extends BaseController {
      constructor() {
        super(name);

        // Bind all methods to the instance
        Object.keys(methods).forEach((key) => {
          if (typeof methods[key] === "function") {
            this[key] = methods[key].bind(this);
          }
        });
      }
    }

    // Add the methods to the prototype
    Object.keys(methods).forEach((key) => {
      if (typeof methods[key] === "function") {
        Controller.prototype[key] = methods[key];
      }
    });

    // Create an instance
    const controller = new Controller();

    // Register with the router
    apiRouter.registerController(prefix, controller);

    return controller;
  }
}

// Export singleton instance
const controllerFactory = new ControllerFactory();
export default controllerFactory;
