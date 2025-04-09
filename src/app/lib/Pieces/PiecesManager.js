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

export async function fetchPartDetails(searchTerm) {
  try {
    const res = await fetch(`/api/search/part/${searchTerm}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
    });
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      // Return the first result
      return data.results[0];
    }
  } catch (err) {
    console.error(`Error fetching part details for "${searchTerm}":`, err);
  }
  return null;
}
