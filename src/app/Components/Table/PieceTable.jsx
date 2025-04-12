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

  // State management
  const pendingUpdatesRef = useRef(new Map());
  const [updatingPieces, setUpdatingPieces] = useState(new Set());
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

  // Helper function to clear updating state
  const clearUpdatingState = useCallback((uuid) => {
    setUpdatingPieces((prev) => {
      const newSet = new Set(prev);
      newSet.delete(uuid);
      return newSet;
    });
  }, []);

  // Function to update a piece in the database (debounced)
  const updatePieceInDb = useCallback(
    debounce(async (uuid, tableId, updates) => {
      try {
        const response = await fetch(`/api/table/${tableId}/brick/${uuid}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        if (!response.ok) {
          throw new Error(`Failed to update piece: ${response.statusText}`);
        }

        // Remove from pending updates after successful save
        pendingUpdatesRef.current.delete(`${tableId}-${uuid}`);
        clearUpdatingState(uuid);
        return true;
      } catch (error) {
        console.error("Error updating piece:", error);
        return false;
      }
    }, 750),
    [clearUpdatingState]
  );

  // Function to update piece in local state
  const updateLocalPiece = useCallback(
    (uuid, tableId, updates) => {
      setPiecesByTable((prev) => {
        if (!prev[tableId]) return prev;

        const updatedPieces = prev[tableId].map((piece) =>
          piece.uuid === uuid ? { ...piece, ...updates } : piece
        );

        return { ...prev, [tableId]: updatedPieces };
      });
    },
    [setPiecesByTable]
  );

  // Safely handle Promise.finally with fallback
  const safelyExecuteUpdatePromise = useCallback(
    (updatePromise, uuid) => {
      if (updatePromise && typeof updatePromise.finally === "function") {
        updatePromise.finally(() => clearUpdatingState(uuid));
      } else {
        // Fallback if no promise returned
        setTimeout(() => clearUpdatingState(uuid), 1000);
      }
    },
    [clearUpdatingState]
  );

  // Handle updating a piece's properties
  const handleUpdatePiece = useCallback(
    async (uuid, field, value) => {
      const tableId = selectedTable.id;
      const currentPiece = pieces.find((p) => p.uuid === uuid);

      if (!currentPiece) {
        console.error("Piece not found:", uuid);
        return;
      }

      // Mark piece as updating
      setUpdatingPieces((prev) => new Set(prev).add(uuid));

      const updateKey = `${tableId}-${uuid}`;
      const updates = { [field]: value };

      // Cancel any pending updates
      if (updatePieceInDb.cancel) {
        updatePieceInDb.cancel();
      }

      // Special field handling
      if (field === "elementColor") {
        try {
          // Get the color ID from availableColors
          const colorObj = currentPiece.availableColors?.find(
            (c) => c.color === value
          );

          if (colorObj?.colorId) {
            updates.elementColorId = colorObj.colorId;

            // Fetch image for this part with new color
            const img_part_url = await fetchImageForPiece(
              currentPiece.elementId,
              colorObj.colorId
            );

            if (img_part_url) {
              updates.elementImage = img_part_url;
            }
          }

          // Update local state immediately
          updateLocalPiece(uuid, tableId, updates);

          // Store merged updates and schedule database update
          const previousUpdates =
            pendingUpdatesRef.current.get(updateKey) || {};
          const mergedUpdates = { ...previousUpdates, ...updates };
          pendingUpdatesRef.current.set(updateKey, mergedUpdates);

          const updatePromise = updatePieceInDb(uuid, tableId, mergedUpdates);
          safelyExecuteUpdatePromise(updatePromise, uuid);
        } catch (error) {
          console.error("Error handling elementColor update:", error);
          clearUpdatingState(uuid);
        }
      } else if (
        field === "elementQuantityOnHand" ||
        field === "elementQuantityRequired"
      ) {
        // Handle quantity fields
        const onHand =
          field === "elementQuantityOnHand"
            ? value
            : currentPiece.elementQuantityOnHand;

        const required =
          field === "elementQuantityRequired"
            ? value
            : currentPiece.elementQuantityRequired;

        updates.countComplete = required === 0 ? null : onHand >= required;

        // Update local state immediately
        updateLocalPiece(uuid, tableId, updates);

        // Store merged updates and schedule database update
        const previousUpdates = pendingUpdatesRef.current.get(updateKey) || {};
        const mergedUpdates = { ...previousUpdates, ...updates };
        pendingUpdatesRef.current.set(updateKey, mergedUpdates);

        const updatePromise = updatePieceInDb(uuid, tableId, mergedUpdates);
        safelyExecuteUpdatePromise(updatePromise, uuid);
      } else if (field === "elementId") {
        // Handle element ID changes
        try {
          // Update local state immediately
          updateLocalPiece(uuid, tableId, updates);

          // Store merged updates
          const previousUpdates =
            pendingUpdatesRef.current.get(updateKey) || {};
          const mergedUpdates = { ...previousUpdates, ...updates };
          pendingUpdatesRef.current.set(updateKey, mergedUpdates);

          // First update database with new elementId
          const success = await updatePieceInDb(uuid, tableId, mergedUpdates);

          if (success) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for a second
            // Fetch additional data
            const [partDetails, availableColors] = await Promise.all([
              fetchPartDetails(value),
              fetchPartColors(value),
            ]);

            const additionalUpdates = {};

            // Update name if available
            if (partDetails?.name) {
              additionalUpdates.elementName = partDetails.name;
            }

            // Update available colors if found
            if (Array.isArray(availableColors) && availableColors.length > 0) {
              additionalUpdates.availableColors = availableColors;

              // Check if current color exists in available colors
              const currentColorExists = availableColors.some(
                (c) =>
                  String(c.colorId) === String(currentPiece.elementColorId) ||
                  c.color === currentPiece.elementColor
              );

              // If current color isn't available, select the first one
              if (!currentColorExists) {
                additionalUpdates.elementColor = availableColors[0].color;
                additionalUpdates.elementColorId = availableColors[0].colorId;
              }
            }

            // Choose best colorId for image fetching
            const imageColorId =
              additionalUpdates.elementColorId ||
              currentPiece.elementColorId ||
              (availableColors?.length > 0 ? availableColors[0].colorId : null);

            // Fetch image if we have a valid colorId
            if (imageColorId) {
              const img_part_url = await fetchImageForPiece(
                value,
                imageColorId
              );
              if (img_part_url) {
                additionalUpdates.elementImage = img_part_url;
              }
            }

            // Apply additional updates if any
            if (Object.keys(additionalUpdates).length > 0) {
              // Update local state first
              updateLocalPiece(uuid, tableId, additionalUpdates);

              // Update database with additional information
              try {
                const response = await fetch(
                  `/api/table/${tableId}/brick/${uuid}`,
                  {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(additionalUpdates),
                  }
                );

                if (!response.ok) {
                  throw new Error(
                    `Failed to update piece details: ${response.statusText}`
                  );
                }
              } catch (error) {
                console.error("Error saving additional piece details:", error);
              }
            }
          }
        } catch (error) {
          console.error("Error handling elementId detail fetch:", error);
        } finally {
          clearUpdatingState(uuid);
        }
      } else {
        // For other field types
        updateLocalPiece(uuid, tableId, updates);

        const previousUpdates = pendingUpdatesRef.current.get(updateKey) || {};
        const mergedUpdates = { ...previousUpdates, ...updates };
        pendingUpdatesRef.current.set(updateKey, mergedUpdates);

        const updatePromise = updatePieceInDb(uuid, tableId, mergedUpdates);
        safelyExecuteUpdatePromise(updatePromise, uuid);
      }
    },
    [
      pieces,
      selectedTable,
      updateLocalPiece,
      updatePieceInDb,
      pendingUpdatesRef,
      safelyExecuteUpdatePromise,
      clearUpdatingState,
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
        const response = await fetch(`/api/table/${tableId}/brick/${uuid}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
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
