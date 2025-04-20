// src/app/api/v1/set/postProcessColor/route.js

import setController from "@/lib/API/Controllers/v1/SetController";

/**
 * POST handler for post-processing colors for a set
 */
export const POST = setController.withErrorHandling(
  setController.postProcessColor.bind(setController)
);
