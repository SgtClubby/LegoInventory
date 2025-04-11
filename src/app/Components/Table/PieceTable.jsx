// src/app/Components/Table/PieceTable.jsx
import { useState, useMemo, useCallback, useRef } from "react";
import { debounce } from "lodash";

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

import colors from "@/Colors/colors";
import { fetchImageForPiece } from "@/lib/Pieces/Images/fetchImages";

export default function PieceTable() {
  const {
    availableTables,
    setAvailableTables,
    selectedTable,
    setSelectedTable,
    piecesByTable,
    setPiecesByTable,
  } = useLego();

  // Keep track of pending updates to avoid UI flicker
  const pendingUpdatesRef = useRef(new Map());

  // Track which pieces are currently loading/updating
  const [updatingPieces, setUpdatingPieces] = useState(new Set());

  // ---------------------------
  // Memoized current pieces for selected table
  // ---------------------------

  const [showAddModal, setAddShowModal] = useState(false);
  const [showDeleteModal, setDeleteShowModal] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  const pieces = useMemo(() => {
    return piecesByTable[selectedTable?.id] || [];
  }, [piecesByTable, selectedTable?.id]);

  // ---------------------------
  // Helper functions for debounced patch of piece data
  // ---------------------------

  // 1. Function to update a piece in the database (debounced)
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

        if (!response.ok) {
          throw new Error(`Failed to update piece: ${response.statusText}`);
        }

        // Remove from pending updates after successful save
        const updateKey = `${tableId}-${uuid}`;
        pendingUpdatesRef.current.delete(updateKey);

        // Remove from updating state
        setUpdatingPieces((prev) => {
          const newSet = new Set(prev);
          newSet.delete(uuid);
          return newSet;
        });

        return true;
      } catch (error) {
        console.error("Error updating piece:", error);
        return false;
      }
    }, 750),
    []
  );

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

  // ---------------------------
  // Handle piece update (debounced)
  // ---------------------------
  const handleUpdatePiece = useCallback(
    async (uuid, field, value) => {
      const tableId = selectedTable.id;
      const currentPiece = pieces.find((p) => p.uuid === uuid);

      if (!currentPiece) return;

      // Mark piece as updating
      setUpdatingPieces((prev) => {
        const newSet = new Set(prev);
        newSet.add(uuid);
        return newSet;
      });

      // Create update payload
      const updates = { [field]: value };

      // Special field handling
      if (field === "elementColor") {
        // When color changes, we need to update both the color name and ID
        const colorObj = colors.find((c) => c.colorName === value);
        if (colorObj) {
          updates.elementColorId = colorObj.colorId;
          updates.elementColor = colorObj.colorName;
        }
      }

      if (
        field === "elementQuantityOnHand" ||
        field === "elementQuantityRequired"
      ) {
        const onHand =
          field === "elementQuantityOnHand"
            ? value
            : currentPiece.elementQuantityOnHand;

        const required =
          field === "elementQuantityRequired"
            ? value
            : currentPiece.elementQuantityRequired;

        updates.countComplete = required === 0 ? null : onHand >= required;
      }

      // Generate a unique key for this update
      const updateKey = `${tableId}-${uuid}`;

      // Cancel any pending updates for this piece
      if (updatePieceInDb.cancel) {
        updatePieceInDb.cancel();
      }

      // Store the full intended state in the pending updates map
      // This ensures we know the complete desired state for this piece
      const previousUpdates = pendingUpdatesRef.current.get(updateKey) || {};
      const mergedUpdates = { ...previousUpdates, ...updates };
      pendingUpdatesRef.current.set(updateKey, mergedUpdates);

      // Update local state immediately for responsive UI
      updateLocalPiece(uuid, tableId, updates);

      // Schedule database update for the combined state
      updatePieceInDb(uuid, tableId, mergedUpdates);

      // Handle special cases that need additional API calls
      if (field === "elementId") {
        try {
          // Fetch part details in parallel
          const partDetailsPromise = fetchPartDetails(value);
          const availableColorsPromise = fetchPartColors(value);

          const [partDetails, availableColors] = await Promise.all([
            partDetailsPromise,
            availableColorsPromise,
          ]);

          const additionalUpdates = {};

          // Update name if available
          if (partDetails?.name) {
            additionalUpdates.elementName = partDetails.name;
          }

          // Update available colors if found
          if (availableColors?.length > 0 && availableColors[0].colorId) {
            additionalUpdates.availableColors = availableColors;

            // Check if current color exists in available colors
            const currentColorExists = availableColors.some(
              (c) =>
                String(c.colorId) === String(currentPiece.elementColorId) ||
                c.color === currentPiece.elementColor
            );

            // If current color isn't available, select the first one
            if (!currentColorExists && availableColors.length > 0) {
              additionalUpdates.elementColor = availableColors[0].color;
              additionalUpdates.elementColorId = availableColors[0].colorId;
            }
          }

          // Fetch image for the piece with new color if needed
          const imageColorId =
            additionalUpdates.elementColorId || currentPiece.elementColorId;
          const img_part_url = await fetchImageForPiece(value, imageColorId);

          if (img_part_url) {
            additionalUpdates.elementImage = img_part_url;
          }

          // If we have additional updates, apply them
          if (Object.keys(additionalUpdates).length > 0) {
            // Cancel any pending updates
            if (updatePieceInDb.cancel) {
              updatePieceInDb.cancel();
            }

            // Update pending updates map
            const currentUpdates =
              pendingUpdatesRef.current.get(updateKey) || {};
            const finalUpdates = { ...currentUpdates, ...additionalUpdates };
            pendingUpdatesRef.current.set(updateKey, finalUpdates);

            // Update local state
            updateLocalPiece(uuid, tableId, additionalUpdates);

            // Send immediate update to database (not debounced)
            await fetch(`/api/table/${tableId}/brick/${uuid}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(finalUpdates),
            });

            // Clear from pending updates
            pendingUpdatesRef.current.delete(updateKey);
          }
        } catch (error) {
          console.error("Error handling elementId update:", error);
        } finally {
          // Always make sure to remove from updating state
          setUpdatingPieces((prev) => {
            const newSet = new Set(prev);
            newSet.delete(uuid);
            return newSet;
          });
        }
      } else if (field === "elementColor") {
        // If color changed, fetch new image
        try {
          const colorId = updates.elementColorId;
          const elementId = currentPiece.elementId;

          const img_part_url = await fetchImageForPiece(elementId, colorId);

          if (img_part_url) {
            const imageUpdate = { elementImage: img_part_url };

            // Update pending updates
            const currentUpdates =
              pendingUpdatesRef.current.get(updateKey) || {};
            const finalUpdates = { ...currentUpdates, ...imageUpdate };
            pendingUpdatesRef.current.set(updateKey, finalUpdates);

            // Update local state
            updateLocalPiece(uuid, tableId, imageUpdate);

            // Update database with the full intended state
            updatePieceInDb(uuid, tableId, finalUpdates);
          }
        } catch (error) {
          console.error("Error updating image for color change:", error);
        }
      }
    },
    [
      pieces,
      selectedTable,
      updateLocalPiece,
      updatePieceInDb,
      pendingUpdatesRef,
    ]
  );

  // ---------------------------
  // Delete handler with optimistic UI updates
  // ---------------------------
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

  // Handle table selection using id for consistency
  const handleTableSelect = (event) => {
    const selectedId = event.target.value;
    const table = availableTables.find((table) => table.id === selectedId);
    setSelectedTable(table);
  };

  // Trigger modal open when user clicks "Add table"
  const handleAddTable = () => {
    setAddShowModal(true);
  };

  const handleDeleteTable = () => {
    setDeleteShowModal(true);
  };

  // When the modal is submitted, add the new table
  const handleAddModalSubmit = async () => {
    const newId = Math.max(...availableTables.map((t) => t.id)) + 1;
    const newTable = {
      id: newId.toString(),
      name: newTableName || `Table ${newId}`,
    };
    const updatedTables = [...availableTables, newTable];

    setAvailableTables(updatedTables);

    addTable(newTableName || `Table ${newId}`); // Call the API to add the table

    setAddShowModal(false);
    setNewTableName("");
  };

  // When the modal is submitted, add the new table
  const handleDeleteModalSubmit = () => {
    // Remove table from availableTables
    const updatedTables = availableTables.filter(
      (table) => table.id != selectedTable.id
    );
    setAvailableTables(updatedTables);
    deleteTable(selectedTable.id); // Call the API to delete the table

    // Hide the modal
    setDeleteShowModal(false);

    // If the deleted table was selected, default to the first table or null if none exist.
    setSelectedTable(updatedTables.find((t) => t.id === 1) || null);
  };

  const [sortConfig, setSortConfig] = useState({
    key: null,
    direction: "ascending",
  });
  // Function to handle sorting
  const sort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

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

  // Apply sorting
  const sortedPieces = useMemo(() => {
    let sortable = [...filteredPieces];

    if (sortConfig.key) {
      sortable.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key])
          return sortConfig.direction === "ascending" ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key])
          return sortConfig.direction === "ascending" ? 1 : -1;
        return 0;
      });
    }

    return sortable;
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
