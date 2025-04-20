// src/app/api/v1/part/[pieceId]/colors/route.js

import partController from "@/lib/API/Controllers/v1/PartController";

/**
 * GET handler for retrieving available colors for a part
 */
export const GET = partController.withErrorHandling(
  partController.getColors.bind(partController)
);
