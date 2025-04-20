// src/app/lib/API/ApiUrlBuilder.js

// src/app/lib/Misc/ApiUrlBuilder.js

/**
 * Builds URLs for external APIs consistently
 */
class ApiUrlBuilder {
  constructor() {
    this.baseUrls = {
      rebrickable: "https://rebrickable.com/api/v3/lego",
      bricklink: "https://www.bricklink.com",
    };
  }

  /**
   * Builds a Rebrickable API URL
   *
   * @param {string} endpoint - API endpoint path
   * @param {Object} queryParams - Query parameters
   * @returns {string} Full URL
   */
  rebrickable(endpoint, queryParams = {}) {
    // Ensure endpoint doesn't start with a slash
    const path = endpoint.startsWith("/") ? endpoint.substring(1) : endpoint;

    // Build the base URL
    let url = `${this.baseUrls.rebrickable}/${path}`;

    // Add query parameters if present
    if (Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();

      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });

      url += `?${params.toString()}`;
    }

    return url;
  }

  /**
   * Builds a BrickLink URL for a part
   *
   * @param {string} itemType - Item type (P for part, M for minifig, etc.)
   * @param {string} itemId - Item ID
   * @returns {string} BrickLink catalog URL
   */
  bricklinkCatalog(itemType, itemId) {
    const typeMap = {
      part: "P",
      minifig: "M",
      set: "S",
      book: "B",
      gear: "G",
      catalog: "C",
      instruction: "I",
      original_box: "O",
    };

    // Determine the item type code
    const typeCode = typeMap[itemType.toLowerCase()] || itemType;

    return `${this.baseUrls.bricklink}/v2/catalog/catalogitem.page?${typeCode}=${itemId}`;
  }

  /**
   * Builds a BrickLink search URL
   *
   * @param {string} query - Search query
   * @param {string} type - Item type (P, M, S, etc.)
   * @returns {string} BrickLink search URL
   */
  bricklinkSearch(query, type = "M") {
    const params = new URLSearchParams({
      q: query,
      type: type,
    });

    return `${
      this.baseUrls.bricklink
    }/ajax/clone/search/searchproduct.ajax?${params.toString()}`;
  }

  /**
   * Builds a BrickLink inventory URL for a set
   *
   * @param {string} setNumber - Set number
   * @returns {string} BrickLink inventory URL
   */
  bricklinkInventory(setNumber) {
    return `${this.baseUrls.bricklink}/catalogItemInv.asp?S=${setNumber}`;
  }

  /**
   * Builds a local API URL
   *
   * @param {string} path - API path
   * @param {Object} queryParams - Query parameters
   * @returns {string} Full local API URL
   */
  local(path, queryParams = {}) {
    // Ensure path starts with a slash
    const apiPath = path.startsWith("/") ? path : `/${path}`;

    // Build the base URL
    let url = `/api${apiPath}`;

    // Add query parameters if present
    if (Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();

      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });

      url += `?${params.toString()}`;
    }

    return url;
  }
}

// Export a singleton instance
const apiUrlBuilder = new ApiUrlBuilder();
export default apiUrlBuilder;
