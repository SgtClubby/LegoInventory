// src/app/api/v1/bricklink/route.js

import bricklinkController from "@/lib/API/Controllers/v1/BricklinkController";

/**
 * POST handler for fetching minifig price data from BrickLink
 */
export const POST = bricklinkController.withErrorHandling(
  bricklinkController.post.bind(bricklinkController)
);
