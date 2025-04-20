// src/app/api/v1/bricklink/price/route.js

import bricklinkController from "@/lib/API/Controllers/v1/BricklinkController";

/**
 * POST handler for batch processing minifig prices from BrickLink
 */
export const POST = bricklinkController.withErrorHandling(
  bricklinkController.processPrice.bind(bricklinkController)
);
