// src/app/lib/Pieces/PiecesManager.js

export async function addPieceToTable(pieceData, tableId) {
  try {
    const res = await fetch(`/api/table/${tableId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
      body: JSON.stringify(pieceData),
    });
    const data = await res.json();

    if (data) {
      return data;
    }
  } catch (err) {
    console.error(`Error adding piece:`, err);
  }
  return null;
}

export async function fetchPiecesFromTable(tableId) {
  try {
    const res = await fetch(`/api/table/${tableId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.error(`Error fetching pieces:`, err);
  }
  return null;
}

export async function deleteTable(uuid) {
  try {
    const res = await fetch(`/api/table/tables`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
      body: JSON.stringify({ uuid }),
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.error(`Error deleting table:`, err);
  }
  return null;
}

// src/app/lib/Pieces/PiecesManager.js

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

    const res = await fetch(`/api/part/${partId}/details`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
      // Add the signal to the fetch request
      signal: abortController.signal,
    });

    // Request completed, remove from active requests
    activeRequests.delete(requestKey);

    if (res.status === 404) {
      console.warn(`Part "${partId}" not found.`);
      return null;
    }

    if (!res.ok) {
      console.log(
        `Failed to fetch part details for "${partId}":`,
        res.statusText
      );
      throw new Error(`Failed to fetch part details: ${res.statusText}`);
    }

    return await res.json();
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

    const res = await fetch(`/api/part/${partId}/colors`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
      // Add the signal to the fetch request
      signal: abortController.signal,
    });

    // Request completed, remove from active requests
    activeRequests.delete(requestKey);

    if (res.status === 404) {
      console.warn(`Part "${partId}" not found.`);
      return null;
    }

    if (!res.ok) {
      console.log(
        `Failed to fetch part details for "${partId}":`,
        res.statusText
      );
      throw new Error(`Failed to fetch part details: ${res.statusText}`);
    }

    const data = await res.json();
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
