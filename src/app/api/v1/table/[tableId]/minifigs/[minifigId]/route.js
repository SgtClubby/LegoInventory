// src/app/api/v1/table/[tableId]/minifig/[minifigId]/route.js

import minifigController from "@/lib/API/Controllers/v1/MinifigController";

/**
 * PATCH handler for updating a specific minifig
 */
export const PATCH = minifigController.withErrorHandling(
  minifigController.patch.bind(minifigController)
);

/**
 * DELETE handler for removing a specific minifig
 */
export const DELETE = minifigController.withErrorHandling(
  minifigController.delete.bind(minifigController)
);
