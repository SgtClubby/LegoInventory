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

export async function fetchPartDetails(partId) {
  try {
    const res = await fetch(`/api/part/${partId}/details`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch part details: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`Error fetching part details for "${partId}":`, err);
    return null;
  }
}

export async function fetchPartColors(partId) {
  try {
    const res = await fetch(`/api/part/${partId}/colors`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch part colors: ${res.statusText}`);
    }
    const data = await res.json();
    if (data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.error(`Error fetching colors for "${partId}":`, err);
    return [];
  }
}
