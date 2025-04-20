// src/app/api/v1/table/[tableId]/route.js

import brickController from "@/lib/API/Controllers/v1/BrickController";

/**
 * GET handler for retrieving all bricks in a table
 */
export const GET = brickController.withErrorHandling(
  brickController.get.bind(brickController)
);

/**
 * POST handler for adding bricks to a table
 */
export const POST = brickController.withErrorHandling(
  brickController.post.bind(brickController)
);
