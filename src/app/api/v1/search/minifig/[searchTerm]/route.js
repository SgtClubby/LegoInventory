// src/app/api/v1/search/minifig/[searchTerm]/route.js

import searchController from "@/lib/API/Controllers/v1/SearchController";

/**
 * GET handler for searching minifigs
 */
export const GET = searchController.withErrorHandling(
  searchController.searchMinifig.bind(searchController)
);
