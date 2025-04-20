// src/app/lib/Table/TableManager.js

export async function fetchTables() {
  try {
    const res = await fetch(`/api/table/tables`, {
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
    console.error(`Error fetching tables:`, err);
  }
  return null;
}

export async function addTable(name, description, isMinifig) {
  try {
    const res = await fetch(`/api/table/tables`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
      body: JSON.stringify({ name, description, isMinifig }),
    });

    if (!res.ok) {
      console.error(`Error adding table:`, res.statusText);
      return null;
    }

    const data = await res.json();

    if (data.id) return data;

    if (data.error) {
      console.error(`Error adding table:`, data.error);
      return null;
    }
  } catch (err) {
    console.error(`Error adding table:`, err);
  }
}

export async function deleteTable(table) {
  try {
    const res = await fetch(`/api/table/tables`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
      body: JSON.stringify(table),
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
