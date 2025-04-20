// src/app/api/route.js

import { withApiVersioning } from "@/lib/API/Middleware/ApiVersionMiddleware";
import { errorResponse } from "@/lib/API/ApiHelpers";

/**
 * GET handler for the API root
 */
async function handleGet(req) {
  return Response.json({
    name: "LEGO Inventory API",
    versions: ["v1"],
    currentVersion: "v1",
    documentation: "/api/docs",
  });
}

/**
 * Fallback handler for all unsupported methods
 */
async function fallbackHandler(req) {
  return errorResponse(
    `Method ${req.method} not allowed at this endpoint`,
    405
  );
}

// Apply API versioning middleware
export const GET = withApiVersioning(handleGet);
export const POST = withApiVersioning(fallbackHandler);
export const PUT = withApiVersioning(fallbackHandler);
export const PATCH = withApiVersioning(fallbackHandler);
export const DELETE = withApiVersioning(fallbackHandler);
