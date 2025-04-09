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

export async function addTable(name) {
  try {
    const res = await fetch(`/api/table/tables`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    if (data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.error(`Error adding table:`, err);
  }
  return null;
}

export async function deleteTable(id) {
  try {
    const res = await fetch(`/api/table/tables`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "LegoInventoryBot/1.0 (+Clomby)",
      },
      body: JSON.stringify({ id }),
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
