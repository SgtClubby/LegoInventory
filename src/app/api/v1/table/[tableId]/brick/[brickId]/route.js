// src/app/api/v1/table/[tableId]/[brickId]/route.js

import brickController from "@/lib/API/Controllers/v1/BrickController";

/**
 * PATCH handler for updating a specific brick
 */
export const PATCH = brickController.withErrorHandling(
  brickController.patch.bind(brickController)
);

/**
 * DELETE handler for removing a specific brick
 */
export const DELETE = brickController.withErrorHandling(
  brickController.delete.bind(brickController)
);
