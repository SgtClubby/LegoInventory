// src/app/api/v1/table/[tableId]/minifig/route.js

import minifigController from "@/lib/API/Controllers/v1/MinifigController";

/**
 * GET handler for retrieving all minifigs in a table
 */
export const GET = minifigController.withErrorHandling(
  minifigController.get.bind(minifigController)
);

/**
 * POST handler for adding minifigs to a table
 */
export const POST = minifigController.withErrorHandling(
  minifigController.post.bind(minifigController)
);
