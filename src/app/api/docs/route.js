// src/app/api/docs/route.js

/**
 * GET handler for API documentation
 */
export async function GET(req) {
  // Generate basic API documentation
  const documentation = {
    title: "LEGO Inventory API Documentation",
    version: "v1",
    description: "API for managing LEGO inventory, sets, and minifigs",
    baseUrl: "/api/v1",
    endpoints: [
      {
        path: "/tables",
        methods: ["GET", "POST", "DELETE"],
        description: "Manage tables for organizing LEGO pieces and minifigs",
      },
      {
        path: "/table/{tableId}",
        methods: ["GET", "POST"],
        description: "Manage all pieces/minifigs in a specific table",
      },
      {
        path: "/table/{tableId}/bricks/{brickId}",
        methods: ["PATCH", "DELETE"],
        description: "Manage individual bricks in a table",
      },
      {
        path: "/table/{tableId}/minifigs/{minifigId}",
        methods: ["PATCH", "DELETE"],
        description: "Manage individual minifigs in a table",
      },
      {
        path: "/search/part/{searchTerm}",
        methods: ["GET"],
        description: "Search for LEGO parts",
      },
      {
        path: "/search/set/{searchTerm}",
        methods: ["GET"],
        description: "Search for LEGO sets",
      },
      {
        path: "/search/minifig/{searchTerm}",
        methods: ["GET"],
        description: "Search for LEGO minifigs",
      },
      {
        path: "/part/{pieceId}/details",
        methods: ["GET"],
        description: "Get details for a specific LEGO part",
      },
      {
        path: "/part/{pieceId}/colors",
        methods: ["GET"],
        description: "Get available colors for a specific LEGO part",
      },
      {
        path: "/image/{pieceId}/{colorId}",
        methods: ["GET"],
        description: "Get image for a specific LEGO part in a specific color",
      },
      {
        path: "/set/{setId}/details",
        methods: ["GET"],
        description: "Get details for a specific LEGO set",
      },
      {
        path: "/set/{setId}/parts",
        methods: ["GET"],
        description: "Get all parts in a specific LEGO set",
      },
      {
        path: "/set/postProcessColor",
        methods: ["POST"],
        description: "Post-process colors for parts in a set",
      },
      {
        path: "/bricklink",
        methods: ["POST"],
        description: "Fetch data from BrickLink for a minifig",
      },
      {
        path: "/bricklink/price",
        methods: ["POST"],
        description: "Fetch price data from BrickLink for multiple minifigs",
      },
    ],
    models: {
      table: {
        id: "string",
        name: "string",
        description: "string",
        isMinifig: "boolean",
        ownerId: "string",
      },
      brick: {
        uuid: "string",
        elementId: "string",
        elementColorId: "string",
        elementColor: "string",
        elementQuantityOnHand: "number",
        elementQuantityRequired: "number",
        countComplete: "boolean",
        highlighted: "boolean",
        tableId: "string",
        ownerId: "string",
      },
      minifig: {
        uuid: "string",
        minifigIdRebrickable: "string",
        minifigIdBricklink: "string",
        minifigQuantity: "number",
        highlighted: "boolean",
        tableId: "string",
        ownerId: "string",
      },
    },
    authentication: "Use 'ownerId' header to identify the user",
  };

  return Response.json(documentation);
}
