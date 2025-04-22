// src/app/lib/Pieces/PiecesManager.js

import { apiFetch } from "@/lib/API/client/apiFetch";

export async function addPieceToTable(pieceData, tableId) {
  try {
    const data = await apiFetch(`/table/${tableId}/bricks`, {
      method: "POST",

      body: JSON.stringify(pieceData),
    });

    if (data) {
      return data;
    }
  } catch (err) {
    console.error(`Error adding piece:`, err);
  }
  return null;
}

export async function addMinifigsToTable(minifigData, tableId) {
  try {
    const data = await apiFetch(`/table/${tableId}/minifigs`, {
      method: "POST",
      body: JSON.stringify(minifigData),
    });

    if (data) {
      return data;
    }
  } catch (err) {
    console.error(`Error adding piece:`, err);
  }
  return null;
}

export async function fetchPieceDataFromTable(table) {
  try {
    let url = `/table/${table.id}/bricks`;
    if (table.isMinifig) {
      url = `/table/${table.id}/minifigs`;
    }

    const data = await apiFetch(url, {
      method: "GET",
    });

    if (data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.error(`Error fetching pieces:`, err);
  }
  return null;
}

// Add a Map to store active requests
const activeRequests = new Map();

export async function fetchPartDetails(partId) {
  try {
    // Create unique request key
    const requestKey = `details-${partId}`;

    // Cancel any existing request for this part ID
    if (activeRequests.has(requestKey)) {
      activeRequests.get(requestKey).abort();
      console.log(`Canceling previous details request for part ${partId}`);
    }

    // Create new abort controller
    const abortController = new AbortController();
    activeRequests.set(requestKey, abortController);

    const data = await apiFetch(`/part/${partId}/details`, {
      method: "GET",
      signal: abortController.signal,
    });

    // Request completed, remove from active requests
    activeRequests.delete(requestKey);

    if (data.error) {
      throw new Error(`Failed to fetch part details: ${data.error}`);
    }

    return data;
  } catch (err) {
    // Check if this was an abort error (which we can ignore)
    if (err.name === "AbortError") {
      console.log(`Request for part ${partId} details was aborted`);
      return null;
    }

    console.error(`Error fetching part details for "${partId}":`, err);
    return null;
  }
}

export async function fetchPartColors(partId) {
  try {
    // Create unique request key
    const requestKey = `colors-${partId}`;

    // Cancel any existing request for this part ID
    if (activeRequests.has(requestKey)) {
      activeRequests.get(requestKey).abort();
      console.log(`Canceling previous colors request for part ${partId}`);
    }

    // Create new abort controller
    const abortController = new AbortController();
    activeRequests.set(requestKey, abortController);

    const data = await apiFetch(`/part/${partId}/colors`, {
      method: "GET",
      signal: abortController.signal,
    });

    // Request completed, remove from active requests
    activeRequests.delete(requestKey);

    if (data.error) {
      throw new Error(`Failed to fetch part details: ${data.error}`);
    }

    if (data && data.length > 0) {
      return data;
    }
  } catch (err) {
    // Check if this was an abort error (which we can ignore)
    if (err.name === "AbortError") {
      console.log(`Request for part ${partId} colors was aborted`);
      return null;
    }

    console.error(`Error fetching colors for "${partId}":`, err);
    return [];
  }
}
