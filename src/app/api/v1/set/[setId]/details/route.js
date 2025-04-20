// src/app/api/v1/set/[setId]/details/route.js

import setController from "@/lib/API/Controllers/v1/SetController";

/**
 * GET handler for retrieving set details
 */
export const GET = setController.withErrorHandling(
  setController.getDetails.bind(setController)
);
