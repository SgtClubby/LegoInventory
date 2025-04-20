// src/app/lib/API/Router/initV1Api.js

import apiVersionManager from "./ApiVersionManager";
import apiRouter from "./ApiRouter";

// Import controllers
import tableController from "../Controllers/v1/TableController";
import brickController from "../Controllers/v1/BrickController";
import minifigController from "../Controllers/v1/MinifigController";
import bricklinkController from "../Controllers/v1/BricklinkController";
import searchController from "../Controllers/v1/SearchController";
import setController from "../Controllers/v1/SetController";
import imageController from "../Controllers/v1/ImageController";
import partController from "../Controllers/v1/PartController";

/**
 * Initialize the v1 API by registering all controllers
 */
function initV1Api() {
  // Create a new router instance for v1
  const v1Router = apiRouter;

  // Register controllers with the router
  v1Router.registerController("tables", tableController);
  v1Router.registerController("table", brickController);
  v1Router.registerController("minifig", minifigController);
  v1Router.registerController("bricklink", bricklinkController);
  v1Router.registerController("search", searchController);
  v1Router.registerController("set", setController);
  v1Router.registerController("image", imageController);
  v1Router.registerController("part", partController);

  // Register the v1 router with the version manager
  apiVersionManager.registerVersion("v1", v1Router);

  // Set as current version
  apiVersionManager.setCurrentVersion("v1");

  console.log("API v1 initialized successfully");

  return v1Router;
}

// Export the initialization function
export default initV1Api;
