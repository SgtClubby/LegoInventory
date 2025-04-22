// src/app/lib/Table/TableManager.js

import { apiFetch } from "@/lib/API/client/apiFetch";

/**
 * Fetches all available tables for the current user
 *
 * @returns {Promise<Array|null>} Array of tables or null on error
 */
export async function fetchAvailableTables() {
  console.log("Fetching available tables...");
  try {
    const data = await apiFetch(
      "/tables",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      {
        retries: 2,
      }
    );

    if (data.error) {
      console.error("No data returned from fetchAvailableTables");
      return null;
    }

    if (Array.isArray(data)) {
      return data;
    } else {
      console.error("Invalid tables response format:", data);
      return null;
    }
  } catch (err) {
    console.error(`Error fetching tables:`, err);
    return null;
  }
}

/**
 * Adds a new table
 *
 * @param {string} name - Table name
 * @param {string} description - Table description
 * @param {boolean} isMinifig - Whether this is a minifig table
 * @returns {Promise<Object|null>} Created table or null on error
 */
export async function addNewTable(name, description, isMinifig) {
  try {
    if (!name || typeof name !== "string") {
      throw new Error("Table name is required");
    }

    const response = await apiFetch(
      "/tables",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description?.trim() || "",
          isMinifig: !!isMinifig,
        }),
      },
      {
        retries: 1,
      }
    );

    console.log("Response from addNewTable:", response);

    if (response && response.id) {
      return response;
    }

    throw new Error(response?.error || "Failed to create table");
  } catch (err) {
    console.error(`Error adding table:`, err);
    return { error: err.message };
  }
}

/**
 * Deletes a table and its contents
 *
 * @param {Object} table - Table to delete
 * @returns {Promise<boolean>} Success status
 */
export async function deleteTable(table) {
  try {
    if (!table || !table.id) {
      throw new Error("Invalid table");
    }

    const response = await apiFetch(
      `/tables?id=${table.id}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      },
      {
        retries: 1,
      }
    );

    return response && response.success === true;
  } catch (err) {
    console.error(`Error deleting table:`, err);
    return false;
  }
}

/**
 * Updates a table's properties
 *
 * @param {Object} table - Table to update
 * @param {Object} updates - Properties to update
 * @returns {Promise<Object|null>} Updated table or null on error
 */
export async function updateTable(table, updates) {
  try {
    if (!table || !table.id) {
      throw new Error("Invalid table");
    }

    if (!updates || Object.keys(updates).length === 0) {
      return table; // Nothing to update
    }

    // Only allow updating name and description
    const validUpdates = {};
    if (updates.name) validUpdates.name = updates.name.trim();
    if (updates.description !== undefined)
      validUpdates.description = updates.description.trim();

    if (Object.keys(validUpdates).length === 0) {
      return table; // No valid updates
    }

    const response = await apiFetch(
      `/table/${table.id}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(validUpdates),
      },
      {
        retries: 1,
      }
    );

    if (response && response.success) {
      return { ...table, ...validUpdates };
    }

    throw new Error(response?.error || "Failed to update table");
  } catch (err) {
    console.error(`Error updating table:`, err);
    return null;
  }
}

/**
 * Checks if a table with the given name already exists
 *
 * @param {string} name - Table name to check
 * @param {Array} existingTables - List of existing tables
 * @returns {boolean} True if a table with this name exists
 */
export function tableNameExists(name, existingTables) {
  if (!name || !existingTables || !Array.isArray(existingTables)) {
    return false;
  }

  const normalizedName = name.trim().toLowerCase();
  return existingTables.some(
    (table) => table.name.toLowerCase() === normalizedName
  );
}
