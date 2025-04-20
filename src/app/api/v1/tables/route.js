// src/app/api/v1/tables/route.js

import tableController from "@/lib/API/Controllers/v1/TableController";

/**
 * GET handler for tables endpoint
 */
export const GET = tableController.withErrorHandling(
  tableController.get.bind(tableController)
);

/**
 * POST handler for tables endpoint
 */
export const POST = tableController.withErrorHandling(
  tableController.post.bind(tableController)
);

/**
 * DELETE handler for tables endpoint
 */
export const DELETE = tableController.withErrorHandling(
  tableController.delete.bind(tableController)
);
