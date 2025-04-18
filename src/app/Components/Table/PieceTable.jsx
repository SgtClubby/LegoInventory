// src/app/Components/Table/PieceTable.jsx

// Functions and Helpers
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { debounce } from "lodash";
import { useLego } from "@/Context/LegoContext";
import { fetchPartDetails, fetchPartColors } from "@/lib/Pieces/PiecesManager";
import colors from "@/Colors/colors.js";

// Components
import VirtualTable from "@/Components/Table/VirtualTable";
import SearchPiece from "../Search/SearchPiece";
import FilterTabs from "../Misc/FilterTabs";

// Icons
import {
  AddRounded,
  DeleteForever,
  ExpandMoreRounded,
} from "@mui/icons-material";
import TableSelectDropdown from "../Misc/TableSelectDropdown";

export default function PieceTable({ newTableName, setNewTableName }) {
  const {
    availableTables,
    selectedTable,
    setSelectedTable,
    piecesByTable,
    setPiecesByTable,
    setAddShowModal,
    setDeleteShowModal,
  } = useLego();

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({
    key: "",
    direction: "ascending",
  });
  const pendingUpdatesRef = useRef(new Map());
  const [updatingPieces, setUpdatingPieces] = useState(new Set());
  const requestIdentifier = useRef(0);

  // Active view state
  const [activeView, setActiveView] = useState("all"); // "all", "incomplete", "complete"

  // Memoized current pieces for selected table
  const pieces = useMemo(() => {
    return piecesByTable[selectedTable?.id] || [];
  }, [piecesByTable, selectedTable?.id]);

  /**
   * Helper function to clear updating state for a piece
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
   */
  const setUpdatingState = useCallback((uuid) => {
    setUpdatingPieces((prev) => {
      const newSet = new Set(prev);
      newSet.add(uuid);
      return newSet;
    });
  }, []);

  /**
   * Updates a piece in the database with debouncing
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

        if (!response.ok) {
          throw new Error(
            `Failed to update piece: ${response.status} ${response.statusText}`
          );
        }

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

  const checkIsUpdating = useCallback(
    (uuid) => {
      return updatingPieces.has(uuid);
    },
    [updatingPieces]
  );

  useEffect(() => {
    // Clear pending updates when the component unmounts
    return () => {
      pendingUpdatesRef.current.clear();
    };
  }, []);

  useEffect(() => {
    // clear updating after interval
    const interval = setInterval(() => {
      setUpdatingPieces((prev) => {
        const newSet = new Set(prev);
        newSet.clear();
        return newSet;
      });
    }, 6500);
    return () => clearInterval(interval);
  }, []);

  /**
   * Handles updating a piece's properties with debouncing and special field handling
   */

  const handleUpdatePiece = useCallback(
    async (uuid, field, value) => {
      console.log(`Updating piece ${uuid}: ${field} = ${value}`);
      const currentRequestId = ++requestIdentifier.current;
      const tableId = selectedTable.id;
      const currentPiece = pieces.find((p) => p.uuid === uuid);

      if (!currentPiece) return;

      // Mark piece as updating
      setUpdatingState(uuid);

      // // Cancel any pending updates for this piece
      // if (updatePieceInDb.cancel) {
      //   updatePieceInDb.cancel();
      // }

      // Special case for elementId, set to "0" if empty
      if (field === "elementId" && (!value || value.length === 0)) {
        value = "0";
      }

      // Create update payload
      const updates = { [field]: value };

      // Preserve invalid state if present
      if (currentPiece.invalid === true) {
        updates.invalid = true;
      }

      // Special field handling
      if (field === "elementColor") {
        // When color changes, we need to update both the color name and ID
        const colorObj = colors.find((c) => c.colorName === value);
        if (colorObj) {
          updates.elementColorId = colorObj.colorId;
        }
      } else if (field === "elementColorId") {
        // Similarly, when ID changes, update the color name too
        const colorObj = colors.find((c) => c.colorId === value);
        if (colorObj) {
          updates.elementColor = colorObj.colorName;
        }
      }

      if (
        field === "elementQuantityOnHand" ||
        field === "elementQuantityRequired"
      ) {
        const onHand =
          field === "elementQuantityOnHand"
            ? parseInt(value)
            : parseInt(currentPiece.elementQuantityOnHand);

        const required =
          field === "elementQuantityRequired"
            ? parseInt(value)
            : parseInt(currentPiece.elementQuantityRequired);

        // Use consistent logic for countComplete regardless of which field is updated
        const isComplete = required === 0 ? null : onHand >= required;

        console.log(isComplete, onHand, required);

        if (field === "elementQuantityOnHand") {
          updates.elementQuantityOnHand = onHand;
        } else {
          updates.elementQuantityRequired = required;
        }

        // Always set countComplete using the same logic
        updates.countComplete = isComplete;
      }

      if (field === "highlighted") {
        updates.highlighted = value;
      }

      // Generate a unique key for this update
      const updateKey = `${tableId}-${uuid}`;

      // Store the full intended state in the pending updates map
      const previousUpdates = pendingUpdatesRef.current.get(updateKey) || {};
      const mergedUpdates = { ...previousUpdates, ...updates };
      pendingUpdatesRef.current.set(updateKey, mergedUpdates);

      // Update local state immediately for responsive UI
      updateLocalPiece(uuid, tableId, updates);

      // Schedule database update for the combined state
      updatePieceInDb(uuid, tableId, mergedUpdates);

      // Handle special cases that need additional API calls
      if (field === "elementId") {
        console.log("Handling elementId update");
        try {
          // Fetch part details in parallel
          if (!value || value.length === 0) {
            value = "0";
          }

          if (currentRequestId !== requestIdentifier.current) {
            clearUpdatingState(uuid);
            return;
          }

          const partDetailsPromise = fetchPartDetails(value);
          const availableColorsPromise = fetchPartColors(value);

          const [partDetails, availableColors] = await Promise.all([
            partDetailsPromise,
            availableColorsPromise,
          ]);

          // After receiving API responses, check again if this is still the latest request
          if (currentRequestId !== requestIdentifier.current) {
            clearUpdatingState(uuid);
            return;
          }

          console.log("Fetched color and piece data");

          const additionalUpdates = {};

          // Update name if available
          if (partDetails?.name) {
            additionalUpdates.elementName = partDetails.name;
            if (updates.invalid) additionalUpdates.invalid = false;
          } else {
            // Only update to "Invalid/Missing ID" if it's not already that value
            if (currentPiece.elementName !== "Invalid/Missing ID") {
              additionalUpdates.elementName = "Invalid/Missing ID";
            }
            if (!updates.invalid) additionalUpdates.invalid = true;
          }

          // Update available colors if found
          if (availableColors?.length > 0) {
            additionalUpdates.availableColors = availableColors;

            // Check if current color exists in available colors
            const currentColorExists = availableColors.some(
              (c) =>
                String(c.colorId) === String(currentPiece.elementColorId) ||
                c.color === currentPiece.elementColor
            );

            // If current color isn't available, select the first one
            if (
              (!currentColorExists && availableColors.length > 0) ||
              (partDetails?.name && currentPiece.elementColorId)
            ) {
              additionalUpdates.elementColor = availableColors[0].color;
              additionalUpdates.elementColorId = availableColors[0].colorId;
            }
          } else {
            // We have fetched an invalid ID, so set colors to reflect this
            if (!currentPiece.availableColors?.[0]?.empty) {
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
            // If we did fetch a valid ID, but no colors, we can set the color to "default"
            if (
              partDetails?.name &&
              currentPiece.elementColorId == null &&
              currentPiece.elementColor == null
            ) {
              additionalUpdates.elementColor =
                availableColors[0]?.color || null;
              additionalUpdates.elementColorId =
                availableColors[0]?.colorId || null;
            }
          }

          // If we have additional updates, apply them
          if (Object.keys(additionalUpdates).length > 0) {
            // Get the latest pending updates for this piece
            const currentUpdates =
              pendingUpdatesRef.current.get(updateKey) || {};
            const finalUpdates = { ...currentUpdates, ...additionalUpdates };
            pendingUpdatesRef.current.set(updateKey, finalUpdates);

            // Update local state first
            updateLocalPiece(uuid, tableId, additionalUpdates);

            // Send update to database with all accumulated changes
            updatePieceInDb(uuid, tableId, finalUpdates);
          } else {
            // Make sure we clear the updating state since we're done
            clearUpdatingState(uuid);
          }
        } catch (error) {
          console.error("Error handling elementId update:", error);
          // Ensure we clear the updating state on error
          clearUpdatingState(uuid);
        }
      }
    },
    [
      pieces,
      selectedTable,
      colors,
      updatingPieces,
      updateLocalPiece,
      updatePieceInDb,
      setUpdatingState,
      clearUpdatingState,
      fetchPartDetails,
      fetchPartColors,
    ]
  );

  /**
   * Handles deleting a piece
   */
  const handleDeletePiece = useCallback(
    async (uuid) => {
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
      }
    },
    [pieces, selectedTable, setPiecesByTable]
  );

  const handleAddTable = () => setAddShowModal(true);
  const handleDeleteTable = () => setDeleteShowModal(true);

  // Sorting function
  const handleSort = (key) => {
    let direction = "ascending";
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending";
    }
    setSortConfig({ key, direction });
  };

  // Filter pieces based on search term and active view
  const filteredPieces = useMemo(() => {
    let filteredByStatus = pieces;

    // First filter by status
    if (activeView === "complete") {
      filteredByStatus = pieces.filter((piece) => piece.countComplete === true);
    } else if (activeView === "incomplete") {
      filteredByStatus = pieces.filter(
        (piece) => piece.countComplete === false
      );
    }

    // Then filter by search term
    if (!searchTerm) return filteredByStatus;

    const lower = searchTerm.toLowerCase();

    return filteredByStatus.filter(
      (piece) =>
        piece.elementName?.toLowerCase().includes(lower) ||
        piece.elementId?.toString().includes(lower) ||
        piece.elementColor?.toLowerCase().includes(lower)
    );
  }, [pieces, searchTerm, activeView]);

  // Apply sorting to filtered pieces
  const sortedPieces = useMemo(() => {
    if (!sortConfig.key) return filteredPieces;

    return [...filteredPieces].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null values
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // Compare values
      if (aValue < bValue) {
        return sortConfig.direction === "ascending" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "ascending" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredPieces, sortConfig]);

  // Stats
  const stats = useMemo(() => {
    const total = pieces.length;
    const complete = pieces.filter((p) => p.countComplete === true).length;
    const incomplete = pieces.filter((p) => p.countComplete === false).length;
    const general = total - complete - incomplete;

    return { total, complete, incomplete, general };
  }, [pieces]);

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-slate-800 rounded-xl shadow-lg  border border-slate-700">
        <div className="p-4 sm:p-6">
          <div className="flex flex-col xl:flex-row xl:items-end gap-6">
            {/* Table Selection */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between -mb-1">
                <h3 className="text-xl font-semibold text-white transition-all duration-200 ease-in-out">
                  {selectedTable ? selectedTable.name : "Select a Table"}
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddTable}
                    className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                    title="Add Table"
                  >
                    <AddRounded className="" fontSize="medium" />
                  </button>

                  {selectedTable?.id > 1 && (
                    <button
                      onClick={handleDeleteTable}
                      className="p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors"
                      title="Delete Table"
                    >
                      <DeleteForever className="" fontSize="medium" />
                    </button>
                  )}
                </div>
              </div>
              {/* Table Select Dropdown */}
              <p className="mb-2 text-xs text-slate-400">
                Select your table. If you don't have any tables, create by
                clicking the "+" button to the right.
              </p>
              <TableSelectDropdown />
            </div>

            {/* Search & Filters */}
            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  Search & Filter
                </h3>

                <div className="text-sm font-medium text-slate-300">
                  {filteredPieces.length}
                  <span className="text-slate-400"> of </span>
                  {pieces.length} pieces
                </div>
              </div>
              <p className="mb-2 text-xs text-slate-400 -mt-3">
                Search for a piece by name, ID, or color. Use the filter tabs to
                filter by completion.
              </p>
              <div className="flex flex-col md:flex-row gap-3 w-full">
                <div className="flex-1 w-full md:w-[50%] ">
                  {/* Search Input */}
                  <SearchPiece
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                  />
                </div>

                {/* View Tabs */}
                <div className="h-12 w-full md:w-[50%]  rounded-lg overflow-hidden">
                  <FilterTabs
                    setActiveView={setActiveView}
                    activeView={activeView}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap gap-4 mt-6 pt-5 border-t border-slate-700">
            <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
              <div className="h-3 w-3 rounded-full bg-slate-400 mr-2"></div>
              <span className="text-slate-300 mr-2">Total:</span>
              <span className="text-white font-semibold">{stats.total}</span>
            </div>

            <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
              <div className="h-3 w-3 rounded-full bg-emerald-500 mr-2"></div>
              <span className="text-slate-300 mr-2">Complete:</span>
              <span className="text-white font-semibold">{stats.complete}</span>
            </div>

            <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
              <div className="h-3 w-3 rounded-full bg-rose-500 mr-2"></div>
              <span className="text-slate-300 mr-2">Incomplete:</span>
              <span className="text-white font-semibold">
                {stats.incomplete}
              </span>
            </div>

            {stats.general > 0 && (
              <div className="bg-slate-700/50 rounded-lg px-4 py-3 flex items-center">
                <div className="h-3 w-3 rounded-full bg-slate-500 mr-2"></div>
                <span className="text-slate-300 mr-2">General:</span>
                <span className="text-white font-semibold">
                  {stats.general}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table Component */}
      <VirtualTable
        pieces={sortedPieces}
        onChange={handleUpdatePiece}
        onDelete={handleDeletePiece}
        isUpdating={checkIsUpdating}
        sort={handleSort}
        sortConfig={sortConfig}
      />

      {/* Modal for adding a new table */}
    </div>
  );
}
