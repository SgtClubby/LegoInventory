// src/app/api/v1/part/[pieceId]/details/route.js

import partController from "@/lib/API/Controllers/v1/PartController";

/**
 * GET handler for retrieving part details
 */
export const GET = partController.withErrorHandling(
  partController.getDetails.bind(partController)
);
