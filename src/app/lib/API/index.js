// src/app/lib/API/index.js

// Export helpers
export { default as apiHelpers } from "./ApiHelpers";

// Export router
export { default as apiRouter } from "./Router/ApiRouter";
export { default as apiVersionManager } from "./Router/ApiVersionManager";
export { default as initV1Api } from "./Router/initV1Api";

// Export middleware
export { withApiVersioning } from "./Middleware/ApiVersionMiddleware";

// Export base controller
export { default as BaseController } from "./Controllers/BaseController";
export { default as controllerFactory } from "./Controllers/ControllerFactory";

// Export utility classes
export { default as apiUrlBuilder } from "./ApiUrlBuilder";
export { default as fetchUtils } from "./FetchUtils";
export { default as rateLimiter } from "./RateLimiter";

// Export controllers directly for convenience
export { default as tableController } from "./Controllers/v1/TableController";
export { default as brickController } from "./Controllers/v1/BrickController";
export { default as minifigController } from "./Controllers/v1/MinifigController";
export { default as bricklinkController } from "./Controllers/v1/BricklinkController";
export { default as searchController } from "./Controllers/v1/SearchController";
export { default as setController } from "./Controllers/v1/SetController";
export { default as imageController } from "./Controllers/v1/ImageController";
export { default as partController } from "./Controllers/v1/PartController";
