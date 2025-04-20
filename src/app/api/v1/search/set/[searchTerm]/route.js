// src/app/api/v1/search/set/[searchTerm]/route.js

import searchController from "@/lib/API/Controllers/v1/SearchController";

/**
 * GET handler for searching LEGO sets
 */
export const GET = searchController.withErrorHandling(
  searchController.searchSet.bind(searchController)
);
