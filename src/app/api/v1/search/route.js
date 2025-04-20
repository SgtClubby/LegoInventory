// src/app/api/v1/search/part/[searchTerm]/route.js

import searchController from "@/lib/API/Controllers/v1/SearchController";

/**
 * GET handler for searching LEGO parts
 */
export const GET = searchController.withErrorHandling(
  searchController.searchPart.bind(searchController)
);
