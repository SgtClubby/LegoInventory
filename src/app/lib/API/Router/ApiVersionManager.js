// src/app/lib/API/Router/ApiVersionManager.js

/**
 * Manages API versions and routing
 */
class ApiVersionManager {
  constructor() {
    this.versions = new Map();
    this.currentVersion = "v1"; // Default version
  }

  /**
   * Register a new API version
   *
   * @param {string} version - Version identifier (e.g., 'v1')
   * @param {Object} router - Router instance for this version
   */
  registerVersion(version, router) {
    this.versions.set(version, router);
  }

  /**
   * Set the current API version
   *
   * @param {string} version - Version identifier
   */
  setCurrentVersion(version) {
    if (!this.versions.has(version)) {
      throw new Error(`API version ${version} is not registered`);
    }
    this.currentVersion = version;
  }

  /**
   * Get router for a specific version
   *
   * @param {string} version - Version identifier (optional, defaults to current)
   * @returns {Object} Router instance
   */
  getRouter(version = null) {
    const v = version || this.currentVersion;
    if (!this.versions.has(v)) {
      throw new Error(`API version ${v} is not registered`);
    }
    return this.versions.get(v);
  }

  /**
   * Get the current API version
   *
   * @returns {string} Current version identifier
   */
  getCurrentVersion() {
    return this.currentVersion;
  }

  /**
   * Parse version from request path
   *
   * @param {string} path - Request path
   * @returns {string|null} Version identifier or null if not found
   */
  parseVersionFromPath(path) {
    const match = path.match(/^\/api\/(v\d+)\//);
    return match ? match[1] : null;
  }
}

// Export singleton instance
const apiVersionManager = new ApiVersionManager();
export default apiVersionManager;
