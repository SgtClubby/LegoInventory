# API Architecture Documentation

## Overview

The LEGO Inventory API follows a controller-based architecture with API versioning. This design provides a clean separation of concerns, improved maintainability, and easier extension for future versions.

## Architecture Components

### Core Components

- **Controllers**: Handle business logic for each resource
- **Routes**: Map HTTP requests to controller methods
- **API Versioning**: Support multiple API versions (/api/v1/...)
- **Caching**: Efficient data caching to reduce external API calls
- **Error Handling**: Consistent error response format

### Directory Structure

```
src/app/
├── api/
│   ├── v1/
│   │   ├── bricklink/
│   │   ├── image/
│   │   ├── part/
│   │   ├── search/
│   │   ├── set/
│   │   └── table/
│   └── route.js (API entrypoint with version routing)
├── lib/
│   ├── API/
│   │   ├── Controllers/
│   │   │   ├── v1/
│   │   │   │   ├── BrickController.js
│   │   │   │   ├── BricklinkController.js
│   │   │   │   ├── ImageController.js
│   │   │   │   ├── MinifigController.js
│   │   │   │   ├── PartController.js
│   │   │   │   ├── SearchController.js
│   │   │   │   ├── SetController.js
│   │   │   │   └── TableController.js
│   │   │   ├── BaseController.js
│   │   │   └── ControllerFactory.js
│   │   ├── Middleware/
│   │   │   └── ApiVersionMiddleware.js
│   │   ├── Router/
│   │   │   ├── ApiRouter.js
│   │   │   ├── ApiVersionManager.js
│   │   │   └── initV1Api.js
│   │   ├── ApiHelpers.js
│   │   ├── ApiUrlBuilder.js
│   │   ├── AppRouterUtils.js
│   │   ├── ExternalApiService.js
│   │   ├── FetchUtils.js
│   │   ├── RateLimiter.js
│   │   └── index.js
│   ├── Cache/
│   │   └── CacheManager.js
│   ├── Color/
│   │   ├── ColorMapper.js
│   │   └── getColorStyle.js
│   ├── Mongo/
│   │   ├── Mongo.js
│   │   └── Schema.js
│   ├── Pieces/
│   │   └── PiecesManager.js
│   ├── Services/
│   │   └── PriceDataHandler.js
│   └── Table/
│       └── TableManager.js
```

## API Versioning

API endpoints are versioned using URL prefixes:

- **v1**: `/api/v1/...` - First API version

This allows for future API versions to be added without breaking existing clients.

## Controllers

Controllers follow a standard pattern:

1. Extend `BaseController`
2. Implement HTTP method handlers (get, post, patch, delete)
3. Use consistent error handling and response formatting

Example:

```javascript
class ExampleController extends BaseController {
  constructor() {
    super("ExampleController");
  }

  async get(req, context) {
    // Handle GET request
    return this.successResponse(data);
  }

  async post(req, context) {
    // Handle POST request
    return this.successResponse(data, "Created successfully");
  }
}
```

## Response Format

All API responses follow a consistent format:

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": [...]
}
```

### Error Response

```json
{
  "error": "Error message",
  "status": 400
}
```

## Caching Strategy

The API uses a multi-level caching strategy:

1. **Memory Cache**: Fast in-memory cache for frequently accessed data
2. **Database Cache**: Persistent cache in the database
3. **External APIs**: Fallback to external APIs when data is not in cache

## External API Integration

The API integrates with external services:

1. **Rebrickable API**: For LEGO set, part, and minifig data
2. **BrickLink**: For minifig pricing data

## Authentication

API endpoints currently use a simple `ownerId` header for user identification.

## Error Handling

Errors are consistently handled through:

1. `withErrorHandling` wrapper
2. Standardized error responses
3. Proper HTTP status codes
4. Detailed console logging

## Extending the API

To add a new resource:

1. Create a new controller in `lib/API/Controllers/v1/`
2. Implement required HTTP method handlers
3. Create route files in `api/v1/`
4. Register the controller in `initV1Api.js`
