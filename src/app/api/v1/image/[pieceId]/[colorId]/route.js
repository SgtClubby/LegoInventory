// src/app/api/v1/image/[pieceId]/[colorId]/route.js

import imageController from "@/lib/API/Controllers/v1/ImageController";

/**
 * GET handler for retrieving part images
 */
export const GET = imageController.withErrorHandling(
  imageController.getImage.bind(imageController)
);
