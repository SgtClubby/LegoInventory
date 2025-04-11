// src/app/Components/Table/VirtualTable.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import VirtualTableHeader from "./VirtualTableHeader";
import PieceRow from "./PieceRow";

export default function VirtualTable({
  pieces,
  onChange,
  onDelete,
  sort,
  sortConfig,
  isUpdating = () => false, // Optional function to check if piece is updating
}) {
  // Table refs
  const tableContainerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(600);

  // Define column widths that will be shared with the header component
  const columnWidths = {
    image: "w-20",
    name: "w-40 lg:w-64 xl:w-auto",
    id: "hidden lg:block w-28 xl:w-auto",
    color: "w-32 lg:w-40 xl:w-auto",
    onHand: "w-24 xl:w-auto",
    required: "w-24 xl:w-auto",
    complete: "w-24 hidden md:block xl:w-auto",
    actions: "w-28 xl:w-auto",
  };

  // Row options
  const rowOptions = {
    height: 64,
  };

  // Update container height on mount and resize
  useEffect(() => {
    const updateContainerHeight = () => {
      if (tableContainerRef.current) {
        // Calculate 80vh minus header height
        const height = Math.floor(window.innerHeight * 0.8) - 100;
        setContainerHeight(height);
      }
    };

    updateContainerHeight();
    window.addEventListener("resize", updateContainerHeight);

    return () => {
      window.removeEventListener("resize", updateContainerHeight);
    };
  }, []);

  // Set up virtualizer with dynamic row height and overscan
  const rowVirtualizer = useVirtualizer({
    count: pieces.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => rowOptions.height,
    overscan: 5, // More efficient overscan
    getItemKey: (index) => pieces[index]?.uuid || index, // Use UUID for stable keys
  });

  // Get virtualized rows
  const virtualRows = rowVirtualizer.getVirtualItems();

  // Memoize renderers for better performance
  const renderedRows = useMemo(() => {
    return virtualRows.map((virtualRow) => {
      const piece = pieces[virtualRow.index];
      // Skip rendering if we don't have a piece (shouldn't happen but safeguard)
      if (!piece) return null;

      return (
        <div
          key={piece.uuid}
          data-index={virtualRow.index}
          className="absolute w-full"
          style={{
            transform: `translateY(${virtualRow.start}px)`,
            height: `${virtualRow.size}px`,
            zIndex: -virtualRow.index + pieces.length, // Ensure correct stacking order
          }}
        >
          <PieceRow
            piece={piece}
            originalId={piece.uuid}
            onChange={onChange}
            onDelete={onDelete}
            columnWidths={columnWidths}
            virtualizer={rowVirtualizer}
            rowOptions={rowOptions}
            index={virtualRow.index}
            isUpdating={isUpdating(piece.uuid)}
          />
        </div>
      );
    });
  }, [virtualRows, pieces, onChange, onDelete, isUpdating]);

  // Empty state
  const emptyState =
    pieces.length === 0 ? (
      <div className="flex items-center justify-center h-48 text-gray-400">
        No pieces found. Add a piece or import a set to get started.
      </div>
    ) : null;

  return (
    <div className="w-full bg-slate-900 overflow-hidden">
      <VirtualTableHeader
        sort={sort}
        sortConfig={sortConfig}
        columnWidths={columnWidths}
      />

      <div
        ref={tableContainerRef}
        className="w-full overflow-auto mt-0"
        style={{ height: `${containerHeight}px` }}
      >
        {emptyState}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {renderedRows}
        </div>
      </div>
    </div>
  );
}
