// src/app/Components/Table/PieceTable.jsx
import { useState, useMemo, useCallback, useRef } from "react";
import { add, debounce, set } from "lodash";

// Icons
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

// Components
import SearchPiece from "@/Components/Search/SearchPiece";
import { addTable, deleteTable } from "@/lib/Table/TableManager";
import TableAddModal from "../Modals/TableAddModal";
import TableDeleteModal from "../Modals/TableDeleteModal";
import { useLego } from "@/Context/LegoContext";
import { fetchPartDetails, fetchPartColors } from "@/lib/Pieces/PiecesManager";
import VirtualTable from "./VirtualTable";
import colors from "@/Colors/colors.js";

export default function PieceTable() {
  const {
    availableTables,
    setAvailableTables,
    selectedTable,
    setSelectedTable,
    piecesByTable,
    setPiecesByTable,
  } = useLego();

  const [showAddModal, setAddShowModal] = useState(false);
  const [showDeleteModal, setDeleteShowModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });

  // Memoized current pieces for selected table
  const pieces = useMemo(() => {
    return piecesByTable[selectedTable?.id] || [];
  }, [piecesByTable, selectedTable?.id]);

  // Update state management
  const pendingUpdatesRef = useRef(new Map());
  const [updatingPieces, setUpdatingPieces] = useState(new Set());

  /**
   * Helper function to clear updating state for a piece
   *
   * @param {string} uuid - The UUID of the piece to remove from updating state
   */
  const clearUpdatingState = useCallback((uuid) => {
    setUpdatingPieces((prev) => {
      const newSet = new Set(prev);
      newSet.delete(uuid);
      return newSet;
    });
  }, []);

  /**
   * Helper function to mark a piece as updating
   *
   * @param {string} uuid - The UUID of the piece to add to updating state
   */
  const setUpdatingState = useCallback((uuid) => {
    setUpdatingPieces((prev) => {
      const newSet = new Set(prev);
      newSet.add(uuid); // FIX: This should ADD the UUID, not delete it
      return newSet;
    });
  }, []);

  /**
   * Updates a piece in the database with debouncing
   *
   * @param {string} uuid - The UUID of the piece to update
   * @param {string} tableId - The ID of the table containing the piece
   * @param {Object} updates - The properties to update
   * @returns {Promise<boolean>} True if update was successful
   */
  const updatePieceInDb = useCallback(
    debounce(async (uuid, tableId, updates) => {
      try {
        const response = await fetch(`/api/table/${tableId}/brick/${uuid}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        });

        console.warn(
          "[updatePieceInDb] Response status: Updated piece: ",
          uuid
        );

        if (!response.ok) {
          throw new Error(
            `Failed to update piece: ${response.status} ${response.statusText}`
          );
        }

        // Update local state with the new piece data
        console.warn(
          "[updatePieceInDb] Successfully updated piece in local state: ",
          uuid
        );

        // Remove from pending updates after successful save
        const updateKey = `${tableId}-${uuid}`;
        pendingUpdatesRef.current.delete(updateKey);

        // Remove from updating state
        clearUpdatingState(uuid);

        return true;
      } catch (error) {
        console.error("Error updating piece:", error);
        clearUpdatingState(uuid);
        return false;
      }
    }, 450),
    [clearUpdatingState]
  );

  /**
   * Updates piece in local state immediately for responsive UI
   *
   * @param {string} uuid - The UUID of the piece to update
   * @param {string} tableId - The ID of the table containing the piece
   * @param {Object} updates - The properties to update
   */
  const updateLocalPiece = useCallback(
    (uuid, tableId, updates) => {
      setPiecesByTable((prev) => {
        // If the table doesn't exist in state yet, return unchanged
        if (!prev[tableId]) return prev;

        // Create a new array for the table's pieces, with the updated piece
        const updatedPieces = prev[tableId].map((piece) =>
          piece.uuid === uuid ? { ...piece, ...updates } : piece
        );

        // Return new state object with updated table pieces
        return {
          ...prev,
          [tableId]: updatedPieces,
        };
      });
    },
    [setPiecesByTable]
  );

  const requestIdentifier = useRef(0);

  /**
   * Handles updating a piece's properties with debouncing and special field handling
   *
   * @param {string} uuid - The UUID of the piece to update
   * @param {string} field - The field to update
   * @param {any} value - The new value for the field
   */
  const handleUpdatePiece = useCallback(
    async (uuid, field, value) => {
      // Check if we have a valid piece before proceeding
      const currentRequestId = ++requestIdentifier.current;
      const tableId = selectedTable.id;
      const currentPiece = pieces.find((p) => p.uuid === uuid);

      console.log(
        `[handleUpdatePiece] Starting update for piece ${uuid}, field: ${field}, value:`,
        value
      );
      console.log(`[handleUpdatePiece] Table ID: ${tableId}`);
      console.log("[handleUpdatePiece] Current piece:", currentPiece);

      if (!currentPiece) {
        console.log(
          `[handleUpdatePiece] Piece ${uuid} not found in current pieces, aborting update`
        );
        return;
      }

      // Mark piece as updating
      console.log(`[handleUpdatePiece] Marking piece ${uuid} as updating`);
      setUpdatingState(uuid);

      // Cancel any pending updates for this piece
      if (updatePieceInDb.cancel) {
        console.warn(
          `[handleUpdatePiece] Cancelling any pending debounced updates`
        );
        updatePieceInDb.cancel();
      }

      // Special case for elementId, set to "0" if empty
      if (field === "elementId" && (!value || value.length === 0)) {
        // FIX: Correct equality check
        console.log(
          `[handleUpdatePiece] Empty elementId value, setting to "0"`
        );
        value = "0";
      }

      // Create update payload
      const updates = { [field]: value };
      console.log(`[handleUpdatePiece] Initial update payload:`, updates);

      // Preserve invalid state if present
      if (currentPiece.invalid === true) {
        // FIX: Correct equality check
        updates.invalid = true;
      }

      // Special field handling
      if (field === "elementColor") {
        console.warn(
          `[handleUpdatePiece] Special handling for elementColor field`
        );
        // When color changes, we need to update both the color name and ID
        const colorObj = colors.find((c) => c.colorName === value);
        console.log(`[handleUpdatePiece] Found color object:`, colorObj);
        if (colorObj) {
          updates.elementColorId = colorObj.colorId;
          console.log(
            `[handleUpdatePiece] Adding elementColorId: ${colorObj.colorId} to updates`
          );
        }
      } else if (field === "elementColorId") {
        console.warn(
          `[handleUpdatePiece] Special handling for elementColorId field`
        );
        // Similarly, when ID changes, update the color name too
        const colorObj = colors.find((c) => c.colorId === value);
        console.log(`[handleUpdatePiece] Found color object:`, colorObj);
        if (colorObj) {
          updates.elementColor = colorObj.colorName;
          console.log(
            `[handleUpdatePiece] Adding elementColor: ${colorObj.colorName} to updates`
          );
        }
      }

      if (
        field === "elementQuantityOnHand" ||
        field === "elementQuantityRequired"
      ) {
        console.warn(
          `[handleUpdatePiece] Special handling for quantity fields`
        );

        const onHand =
          field === "elementQuantityOnHand"
            ? value
            : currentPiece.elementQuantityOnHand;

        const required =
          field === "elementQuantityRequired"
            ? value
            : currentPiece.elementQuantityRequired;

        console.log(
          `[handleUpdatePiece] Quantity calculation - onHand: ${onHand}, required: ${required}`
        );

        updates.countComplete = required === 0 ? null : onHand >= required;
        console.log(
          `[handleUpdatePiece] Setting countComplete to: ${updates.countComplete}`
        );
      }

      // Generate a unique key for this update
      const updateKey = `${tableId}-${uuid}`;
      console.log(`[handleUpdatePiece] Generated update key: ${updateKey}`);

      // Store the full intended state in the pending updates map
      // This ensures we know the complete desired state for this piece
      const previousUpdates = pendingUpdatesRef.current.get(updateKey) || {};
      console.log(
        `[handleUpdatePiece] Previous pending updates:`,
        previousUpdates
      );

      const mergedUpdates = { ...previousUpdates, ...updates };
      console.log(
        `[handleUpdatePiece] Merged updates (previous + current):`,
        mergedUpdates
      );

      pendingUpdatesRef.current.set(updateKey, mergedUpdates);
      console.log(
        `[handleUpdatePiece] Stored merged updates in pendingUpdatesRef`
      );

      // Update local state immediately for responsive UI
      console.log(
        `[handleUpdatePiece] Updating local state for immediate UI response`
      );
      updateLocalPiece(uuid, tableId, updates);

      // Schedule database update for the combined state
      console.log(`[handleUpdatePiece] Scheduling debounced database update`);
      updatePieceInDb(uuid, tableId, mergedUpdates);

      // Handle special cases that need additional API calls
      if (field === "elementId") {
        console.warn(
          `[handleUpdatePiece] Special handling for elementId field`
        );

        try {
          // Fetch part details in parallel
          if (!value || value.length === 0) {
            // FIX: Correct equality check
            // Set to ID 0 if empty, to avoid API errors
            console.log(
              `[handleUpdatePiece] Empty elementId value, setting to "0"`
            );
            value = "0";
          }

          console.log(
            `[handleUpdatePiece] Fetching part details and colors for elementId: ${value}`
          );
          if (currentRequestId !== requestIdentifier.current) {
            console.log(
              `[handleUpdatePiece] Aborting stale request ${currentRequestId}`
            );
            clearUpdatingState(uuid);
            return;
          }
          const partDetailsPromise = fetchPartDetails(value);
          const availableColorsPromise = fetchPartColors(value);

          console.log(
            `[handleUpdatePiece] Waiting for part details and colors API responses`
          );
          const [partDetails, availableColors] = await Promise.all([
            partDetailsPromise,
            availableColorsPromise,
          ]);

          // After receiving API responses, check again if this is still the latest request
          if (currentRequestId !== requestIdentifier.current) {
            console.log(
              `[handleUpdatePiece] Ignoring stale response for request ${currentRequestId}`
            );
            clearUpdatingState(uuid);
            return;
          }
          console.log(
            `[handleUpdatePiece] Received part details:`,
            partDetails
          );
          console.log(
            `[handleUpdatePiece] Received available colors:`,
            availableColors
          );

          const additionalUpdates = {};
          console.log(
            `[handleUpdatePiece] Preparing additional updates based on API responses`
          );

          console.log("[handleUpdatePiece] current update", updates);

          // Update name if available
          if (partDetails?.name) {
            additionalUpdates.elementName = partDetails.name;
            if (updates.invalid) additionalUpdates.invalid = false;

            console.log(
              `[handleUpdatePiece] Setting elementName to: ${partDetails.name}`
            );
          } else {
            // Only update to "Invalid/Missing ID" if it's not already that value
            if (currentPiece.elementName !== "Invalid/Missing ID") {
              // FIX: Correct condition
              additionalUpdates.elementName = "Invalid/Missing ID";
              console.log(
                `[handleUpdatePiece] Setting elementName to: "Invalid/Missing ID"`
              );
            }
            if (!updates.invalid) additionalUpdates.invalid = true;
          }

          // Update available colors if found
          if (availableColors?.length > 0) {
            additionalUpdates.availableColors = availableColors;
            console.log(
              `[handleUpdatePiece] Setting availableColors with ${availableColors.length} colors`
            );

            // Check if current color exists in available colors
            const currentColorExists = availableColors.some(
              (c) =>
                String(c.colorId) === String(currentPiece.elementColorId) ||
                c.color === currentPiece.elementColor
            );

            console.log(
              `[handleUpdatePiece] Current color exists in available colors: ${currentColorExists}`
            );

            // If current color isn't available, select the first one
            if (!currentColorExists && availableColors.length > 0) {
              additionalUpdates.elementColor = availableColors[0].color;
              additionalUpdates.elementColorId = availableColors[0].colorId;
              console.log(
                `[handleUpdatePiece] Current color not available, selecting first available color: ${availableColors[0].color} (ID: ${availableColors[0].colorId})`
              );
            }
          } else {
            // We have fetched an invalid ID, so set colors to reflect this
            console.log(
              `[handleUpdatePiece] No available colors found for elementId: ${value}`
            );

            // Only update if current available colors don't have an empty property
            if (!currentPiece.availableColors?.[0]?.empty) {
              // FIX: Add optional chaining
              additionalUpdates.availableColors = [{ empty: true }];
            }

            // Only reset colors if they currently have values
            if (
              currentPiece.elementColorId != null ||
              currentPiece.elementColor != null
            ) {
              additionalUpdates.elementColorId = null;
              additionalUpdates.elementColor = null;
            }

            console.log(
              `[handleUpdatePiece] No available colors found, setting empty color values`
            );
          }

          // If we have additional updates, apply them
          if (Object.keys(additionalUpdates).length > 0) {
            console.log(
              `[handleUpdatePiece] Have ${
                Object.keys(additionalUpdates).length
              } additional updates to apply`
            );

            // Get the latest pending updates for this piece
            const currentUpdates =
              pendingUpdatesRef.current.get(updateKey) || {};
            console.log(
              `[handleUpdatePiece] Current pending updates:`,
              currentUpdates
            );

            const finalUpdates = { ...currentUpdates, ...additionalUpdates };
            console.log(
              `[handleUpdatePiece] Final updates (current + additional):`,
              finalUpdates
            );

            pendingUpdatesRef.current.set(updateKey, finalUpdates);
            console.log(
              `[handleUpdatePiece] Stored final updates in pendingUpdatesRef`
            );

            // Update local state first
            console.log(
              `[handleUpdatePiece] Updating local state with additional updates`
            );
            updateLocalPiece(uuid, tableId, additionalUpdates);

            // Send update to database with all accumulated changes
            console.log(
              `[handleUpdatePiece] Sending update to database with all changes`
            );
            updatePieceInDb(uuid, tableId, finalUpdates);
          } else {
            console.log(`[handleUpdatePiece] No additional updates needed`);
            // Make sure we clear the updating state since we're done
            clearUpdatingState(uuid);
          }
        } catch (error) {
          console.error(
            `[handleUpdatePiece] Error handling elementId update:`,
            error
          );
          // Ensure we clear the updating state on error
          clearUpdatingState(uuid);
        }
      } else {
        // For non-elementId updates, we need to make sure updating state is cleared eventually
        // The debounced updatePieceInDb will handle this when it completes
      }

      console.log(
        `[handleUpdatePiece] Completed update process for piece ${uuid}, field: ${field}`
      );
    },
    [
      pieces,
      selectedTable,
      colors, // FIX: Add missing dependency
      updateLocalPiece,
      updatePieceInDb,
      setUpdatingState, // FIX: Add missing dependency
      clearUpdatingState, // FIX: Add missing dependency
      fetchPartDetails, // FIX: Add missing dependency
      fetchPartColors, // FIX: Add missing dependency
    ]
  );

  // Handle deleting a piece
  const handleDeletePiece = useCallback(
    async (uuid) => {
      if (!confirm("Are you sure you want to delete this piece?")) return;

      const tableId = selectedTable.id;

      // Optimistically remove from UI first
      setPiecesByTable((prev) => {
        const updatedPieces =
          prev[tableId]?.filter((p) => p.uuid !== uuid) || [];
        return { ...prev, [tableId]: updatedPieces };
      });

      try {
        // Then delete from database
        const response = await fetch(`/api/table/${tableId}/brick/${uuid}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete piece: ${response.statusText}`);
        }
      } catch (error) {
        console.error("Error deleting piece:", error);

        // If deletion fails, restore the piece in UI
        setPiecesByTable((prev) => {
          const restoredPiece = pieces.find((p) => p.uuid === uuid);
          if (!restoredPiece) return prev;

          const updatedPieces = [...(prev[tableId] || []), restoredPiece];
          return { ...prev, [tableId]: updatedPieces };
        });

        alert("Failed to delete piece. Please try again.");
      }
    },
    [pieces, selectedTable, setPiecesByTable]
  );

  // Table management functions
  const handleTableSelect = (event) => {
    const selectedId = event.target.value;
    const table = availableTables.find((table) => table.id === selectedId);
    setSelectedTable(table);
  };

  const handleAddTable = () => setAddShowModal(true);
  const handleDeleteTable = () => setDeleteShowModal(true);

  const handleAddModalSubmit = async () => {
    const newId = Math.max(...availableTables.map((t) => t.id)) + 1;
    const newTable = {
      id: newId.toString(),
      name: newTableName || `Table ${newId}`,
    };

    setAvailableTables([...availableTables, newTable]);
    addTable(newTableName || `Table ${newId}`);
    setAddShowModal(false);
    setNewTableName("");
  };

  const handleDeleteModalSubmit = () => {
    const updatedTables = availableTables.filter(
      (table) => table.id != selectedTable.id
    );

    setAvailableTables(updatedTables);
    deleteTable(selectedTable.id);
    setDeleteShowModal(false);
    setSelectedTable(updatedTables.find((t) => t.id === "1") || null);
  };

  // Sorting function
  const sort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Filter pieces based on search term
  const filteredPieces = useMemo(() => {
    if (!debouncedSearchTerm) return pieces;

    const lower = debouncedSearchTerm.toLowerCase();
    const regex = new RegExp(
      lower
        .split(" ")
        .map((word) => `(?=.*${word})`)
        .join(""),
      "i"
    );

    return pieces.filter(
      (piece) =>
        regex.test(piece.elementName) ||
        regex.test(piece.elementId.toString()) ||
        regex.test(piece.elementColor)
    );
  }, [pieces, debouncedSearchTerm]);

  // Apply sorting to filtered pieces
  const sortedPieces = useMemo(() => {
    if (!sortConfig.key) return filteredPieces;

    return [...filteredPieces].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredPieces, sortConfig]);

  return (
    <div>
      <div className="bg-slate-700 rounded-lg shadow overflow-hidden">
        <div className="flex items-center justify-between p-4 bg-slate-800 border-b">
          {/* Table control header (Table select / Piece search) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 w-full">
            {/* Search input - full width on mobile, fits in row on md+ */}
            <div className="flex-1 w-full md:max-w-[320px]">
              <SearchPiece
                setSearchTerm={setDebouncedSearchTerm}
                searchTerm={debouncedSearchTerm}
              />
            </div>

            {/* Grouped table controls */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
              {/* Label + Select Table */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label
                  htmlFor="tableSelect"
                  className="text-gray-100 whitespace-nowrap"
                >
                  Select Table:
                </label>
                <select
                  id="tableSelect"
                  value={selectedTable ? selectedTable.id : 1}
                  onChange={handleTableSelect}
                  className="border border-gray-300 rounded-lg p-2 text-gray-100 bg-slate-800"
                >
                  {availableTables.map((table) => (
                    <option
                      className="text-gray-100 bg-slate-800"
                      key={table.id}
                      value={table.id}
                    >
                      {table.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add / Remove buttons */}
              <div className="flex gap-3 sm:ml-4 flex-wrap">
                <button
                  onClick={handleAddTable}
                  className="flex items-center text-gray-100 hover:text-gray-400"
                >
                  <AddCircleOutlineIcon className="mr-1" />
                  Add
                </button>

                {selectedTable?.id > 1 && (
                  <button
                    onClick={handleDeleteTable}
                    className="flex items-center text-gray-100 hover:text-gray-400"
                  >
                    <DeleteOutlineIcon className="mr-1 text-red-500" />
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <VirtualTable
          pieces={sortedPieces}
          onChange={handleUpdatePiece}
          onDelete={handleDeletePiece}
          isUpdating={(uuid) => updatingPieces.has(uuid)}
          sort={sort}
          sortConfig={sortConfig}
        />
      </div>

      {/* Modal for adding a new table */}
      {showAddModal && (
        <TableAddModal
          setNewTableName={setNewTableName}
          newTableName={newTableName}
          toggleModal={setAddShowModal}
          handleSubmit={handleAddModalSubmit}
        />
      )}
      {/* Modal for deleting a table */}
      {showDeleteModal && (
        <TableDeleteModal
          toggleModal={setDeleteShowModal}
          handleSubmit={handleDeleteModalSubmit}
        />
      )}
    </div>
  );
}
