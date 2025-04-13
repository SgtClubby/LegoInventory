// src/app/Components/Table/VirtualTable.jsx
import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import PieceRow from "@/Components/Table/PieceRow";
import DeletePieceModal from "../Modals/DeletePieceModal";

/**
 * VirtualTable component for efficiently rendering large lists of pieces
 *
 * @param {Array} pieces - The array of pieces to display
 * @param {Function} onChange - Function to handle changes to piece properties
 * @param {Function} onDelete - Function to handle piece deletion
 * @param {Function} sort - Function to handle sorting
 * @param {Object} sortConfig - Current sort configuration
 * @param {Function} isUpdating - Function to check if a piece is being updated
 * @returns {JSX.Element} The rendered virtual table
 */
export default function VirtualTable({
  pieces,
  onChange,
  onDelete,
  sort,
  sortConfig,
  isUpdating = () => false,
}) {
  // Table refs and state
  const tableContainerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pieceToDelete, setPieceToDelete] = useState(null);

  // Update container height on mount and resize
  useEffect(() => {
    const updateContainerHeight = () => {
      if (tableContainerRef.current) {
        // Calculate available height (95vh minus some padding for other elements)
        const availableHeight = Math.floor(window.innerHeight * 0.95) - 180;
        setContainerHeight(Math.max(400, availableHeight)); // Set minimum height of 400px
      }
    };

    updateContainerHeight();
    window.addEventListener("resize", updateContainerHeight);
    return () => window.removeEventListener("resize", updateContainerHeight);
  }, []);

  // Set up virtualizer with dynamic row height
  const rowVirtualizer = useVirtualizer({
    count: pieces.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 72, // Default row height
    overscan: 10, // Show more rows for smoother scrolling
    getItemKey: (index) => pieces[index]?.uuid || index,
  });

  // Handle piece deletion
  const handleDeleteInitiate = useCallback(
    (pieceId) => {
      const piece = pieces.find((p) => p.uuid === pieceId);
      if (piece) {
        setPieceToDelete({ id: pieceId, piece });
        setDeleteModalOpen(true);
      }
    },
    [pieces]
  );

  const handleDeleteConfirm = useCallback(() => {
    if (pieceToDelete) {
      onDelete(pieceToDelete.id);
      setDeleteModalOpen(false);
      setPieceToDelete(null);
    }
  }, [pieceToDelete, onDelete]);

  // Get virtualized rows
  const virtualRows = rowVirtualizer.getVirtualItems();

  // Scroll to top whenever pieces change significantly
  useEffect(() => {
    if (tableContainerRef.current) {
      tableContainerRef.current.scrollTop = 0;
    }
  }, [sortConfig, pieces.length]);

  // Empty state content
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16 mb-4 text-slate-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <p className="text-lg font-medium">No pieces found</p>
      <p className="text-sm mt-1 text-slate-500">
        Try adjusting your search or filters
      </p>
    </div>
  );

  const columns = [
    {
      key: null,
      label: "",
      className: "",
      width: "w-[5%] min-w-20",
      sortable: false,
    },
    {
      key: "elementName",
      label: "Name",
      width: "w-[20%] min-w-[10%]",
      className: "",
      sortable: true,
    },
    {
      key: "elementId",
      label: "ID",
      className: "",
      width: "w-[10%]",
      sortable: true,
    },
    {
      key: "elementColor",
      label: "Color",
      className: "",
      width: "w-[15%]",
      sortable: true,
    },
    {
      key: "elementQuantityOnHand",
      label: "On Hand",
      className: "",
      width: "w-[10%]",
      sortable: true,
    },
    {
      key: "elementQuantityRequired",
      label: "Required",
      className: "",
      width: "w-[10%]",
      sortable: true,
    },
    {
      key: "countComplete",
      label: "Complete",
      className: "flex 2xl:justify-center",
      width: "w-[15%]",
      sortable: true,
    },
    {
      key: null,
      label: "Actions",
      className: "flex 2xl:justify-end",
      width: "w-[15%]",
      sortable: false,
    },
  ];

  // Table header component
  const TableHeader = () => {
    // Render a header cell with sort functionality if sortable
    const HeaderCell = ({ column }) => {
      if (!column.sortable) {
        return (
          <div
            className={`${column.className} px-4 py-3 ${column.width} flex-shrink-0 text-slate-300 font-medium`}
          >
            {column.label}
          </div>
        );
      }

      return (
        <div
          className={`${column.className} px-4 py-3 ${column.width} flex-shrink-0 text-slate-300 font-medium cursor-pointer group`}
          onClick={() => sort(column.key)}
        >
          <div className="flex items-center">
            <span>{column.label}</span>
            <span
              className={`ml-1.5 text-xs ${
                sortConfig.key === column.key
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-50"
              } transition-opacity duration-200`}
            >
              {sortConfig.key === column.key ? (
                sortConfig.direction === "ascending" ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-blue-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-blue-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                )
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M5 8l5 5 5-5H5z" />
                </svg>
              )}
            </span>
          </div>
        </div>
      );
    };

    return (
      <div className="sticky top-0 z-10 bg-slate-800 border-b border-slate-700 flex items-center w-full rounded-t-xl">
        {columns.map((column, index) => (
          <HeaderCell key={column.key || `col-${index}`} column={column} />
        ))}
      </div>
    );
  };

  const renderedRows = useMemo(() => {
    return virtualRows.map((virtualRow) => {
      const piece = pieces[virtualRow.index];
      if (!piece) return null;

      return (
        <div
          key={piece.uuid}
          data-index={virtualRow.index}
          className="absolute w-full"
          style={{
            transform: `translateY(${virtualRow.start}px)`,
            height: `${virtualRow.size}px`,
            zIndex: -virtualRow.index + pieces.length,
          }}
        >
          <PieceRow
            piece={piece}
            originalId={piece.uuid}
            onChange={onChange}
            onDelete={handleDeleteInitiate}
            isUpdating={isUpdating(piece.uuid)}
            columns={columns}
            index={virtualRow.index}
            isLast={virtualRow.index === pieces.length - 1}
          />
        </div>
      );
    });
  }, [virtualRows, pieces, onChange, handleDeleteInitiate, isUpdating]);

  // Mobile card view for small screens
  const MobileCardView = () => (
    <div className="switch:hidden space-y-3 p-2">
      {pieces.length > 0 ? (
        pieces.map((piece) => (
          <PieceRow
            key={piece.uuid}
            piece={piece}
            originalId={piece.uuid}
            onChange={onChange}
            columns={columns}
            onDelete={handleDeleteInitiate}
            isUpdating={isUpdating(piece.uuid)}
          />
        ))
      ) : (
        <EmptyState />
      )}

      {pieces.length > 50 && (
        <div className="text-center p-3 text-slate-400">
          Showing 50 of {pieces.length} pieces. Use filters to narrow down
          results.
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-slate-700 w-full h-full">
        {/* Desktop Table View */}
        <div className="hidden switch:block w-full h-full">
          <TableHeader />

          <div
            ref={tableContainerRef}
            className="overflow-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent w-full"
            style={{ height: `${containerHeight}px` }}
          >
            {pieces.length === 0 ? (
              <EmptyState />
            ) : (
              <div
                className="relative w-full"
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                }}
              >
                {renderedRows}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Card View */}
        <MobileCardView />
      </div>

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && pieceToDelete && (
        <DeletePieceModal
          toggleModal={setDeleteModalOpen}
          handleDelete={handleDeleteConfirm}
          piece={pieceToDelete.piece}
        />
      )}
    </>
  );
}
