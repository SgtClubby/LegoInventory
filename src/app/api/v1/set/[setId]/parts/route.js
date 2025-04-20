// src/app/api/v1/set/[setId]/parts/route.js

import setController from "@/lib/API/Controllers/v1/SetController";

/**
 * GET handler for retrieving all parts in a set
 */
export const GET = setController.withErrorHandling(
  setController.getParts.bind(setController)
);
