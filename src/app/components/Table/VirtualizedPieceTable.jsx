import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import VirtualTableHeader from "./VirtualTableHeader";
import KeepAliveRow from "./Utils/KeepAliveRow";
import { throttle } from "lodash";

export default function VirtualizedPieceTable({
  pieces,
  onChange,
  onDelete,
  sort,
  sortConfig,
}) {
  // Define column widths that will be shared with the header component
  const columnWidths = {
    image: "w-20",
    name: "w-40 lg:w-64 xl:w-auto",
    id: "hidden lg:table-cell w-28 xl:w-auto",
    color: "w-32 lg:w-40 xl:w-auto",
    onHand: "w-24 xl:w-auto",
    required: "w-24 xl:w-auto",
    complete: "w-24 hidden md:table-cell xl:w-auto",
    actions: "w-28 xl:w-auto",
  };

  // Options for rows
  const rowOptions = {
    height: 70,
  };

  // DOM node cache for rendered rows
  const domNodeCache = useRef(new Map());
  const [renderedPieceIds, setRenderedPieceIds] = useState(new Set());
  const parentRef = useRef(null);
  const resizeObserverRef = useRef(null);

  // Previous pieces array length for comparison
  const previousPiecesLength = useRef(pieces.length);

  // Batch size for progressive rendering
  const RENDER_BATCH_SIZE = 5;
  const pendingRenderQueue = useRef([]);
  const renderTimeoutRef = useRef(null);

  // Track if we're currently filtering/searching
  const isFilteringRef = useRef(false);

  // Register a DOM node for keep-alive
  const registerKeepAliveNode = useCallback((id, node) => {
    domNodeCache.current.set(id, node);
  }, []);

  // Unregister a DOM node
  const unregisterKeepAliveNode = useCallback((id) => {
    domNodeCache.current.delete(id);
  }, []);

  const visualizerUtils = {
    registerKeepAliveNode,
    unregisterKeepAliveNode,
  };

  const extendedVirtualizer = useVirtualizer({
    count: pieces.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowOptions.height,
    overscan: 5,
    // Setting a smaller measure frequency to limit how often it measures
    measureElementSize: (node) => node.offsetHeight,
  });

  // Progressive rendering function
  const processRenderQueue = useCallback(() => {
    if (pendingRenderQueue.current.length === 0) return;

    // Take a batch of items from the queue
    const batch = pendingRenderQueue.current.splice(0, RENDER_BATCH_SIZE);

    setRenderedPieceIds((prev) => {
      const next = new Set(prev);
      batch.forEach((id) => next.add(id));
      return next;
    });

    // If there are still items in the queue, schedule another batch
    if (pendingRenderQueue.current.length > 0) {
      renderTimeoutRef.current = setTimeout(processRenderQueue, 16); // Approx 1 frame at 60fps
    } else {
      renderTimeoutRef.current = null;
    }
  }, []);

  // Throttled resize handler
  const handleResize = useCallback(
    throttle(() => {
      if (extendedVirtualizer) {
        extendedVirtualizer.measure();
      }
    }, 100),
    [extendedVirtualizer]
  );

  // Set up resize observer
  useEffect(() => {
    if (parentRef.current) {
      resizeObserverRef.current = new ResizeObserver(handleResize);
      resizeObserverRef.current.observe(parentRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [handleResize]);

  // Clean up render timeout on unmount
  useEffect(() => {
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, []);

  // Update renderedPieceIds based on visible rows and data changes
  useEffect(() => {
    const virtualItems = extendedVirtualizer.getVirtualItems();

    // Detect filtering operations (search)
    const isFiltering = pieces.length < previousPiecesLength.current;
    previousPiecesLength.current = pieces.length;
    isFilteringRef.current = isFiltering;

    // Clear the queue when data changes
    pendingRenderQueue.current = [];
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = null;
    }

    // Immediately add visible items
    const visibleIds = new Set();
    virtualItems.forEach((item) => {
      if (pieces[item.index]) {
        visibleIds.add(pieces[item.index].uuid);
      }
    });

    // During filtering, we want to maintain all already rendered rows
    if (isFiltering) {
      setRenderedPieceIds((prev) => {
        const filtered = new Set();
        // Keep only pieces that still exist after filtering
        pieces.forEach((piece) => {
          if (prev.has(piece.uuid)) {
            filtered.add(piece.uuid);
          }
        });
        // Add currently visible pieces
        visibleIds.forEach((id) => filtered.add(id));
        return filtered;
      });
    } else {
      // Normal scrolling: we queue all pieces for progressive rendering
      // but immediately show visible ones

      // If there are only a few pieces (e.g., after a search),
      // render them all immediately
      if (pieces.length < 100) {
        setRenderedPieceIds((prev) => {
          const next = new Set(prev);
          pieces.forEach((piece) => next.add(piece.uuid));
          return next;
        });
      } else {
        // Otherwise, render visible ones immediately and queue the rest
        setRenderedPieceIds((prev) => {
          const next = new Set(prev);
          visibleIds.forEach((id) => next.add(id));
          return next;
        });

        // Queue the remaining pieces for progressive rendering
        const remainingPieces = pieces
          .filter(
            (piece) =>
              !visibleIds.has(piece.uuid) && !renderedPieceIds.has(piece.uuid)
          )
          .map((piece) => piece.uuid);

        if (remainingPieces.length > 0) {
          pendingRenderQueue.current = remainingPieces;
          processRenderQueue();
        }
      }
    }
  }, [extendedVirtualizer.getVirtualItems(), pieces, processRenderQueue]);

  // Memoize the visible items for better performance
  const visibleIndices = useMemo(() => {
    return new Set(
      extendedVirtualizer.getVirtualItems().map((item) => item.index)
    );
  }, [extendedVirtualizer.getVirtualItems()]);

  return (
    <div className="w-full">
      <VirtualTableHeader
        sort={sort}
        sortConfig={sortConfig}
        columnWidths={columnWidths}
      />
      <div
        className="overflow-auto w-full max-h-[calc(80vh-40px)]"
        ref={parentRef}
      >
        <div
          style={{
            height: extendedVirtualizer.getTotalSize(),
            position: "relative",
            width: "100%",
          }}
        >
          {/* Render all pieces that have been seen at least once */}
          {pieces.map((piece, index) => {
            // Only render if this piece has been seen before
            if (!renderedPieceIds.has(piece.uuid)) return null;

            // Check if the item is currently in the visible viewport
            const isVisible = visibleIndices.has(index);

            // Position is controlled by the virtualizer positioning
            // Find the virtual item if it's currently visible
            const virtualItem = isVisible
              ? extendedVirtualizer
                  .getVirtualItems()
                  .find((virtual) => virtual.index === index)
              : null;

            // If this piece is not currently visible, hide it
            const style = virtualItem
              ? {
                  position: "absolute",
                  top: `${virtualItem.start}px`,
                  height: `${rowOptions.height}px`,
                  width: "100%",
                  willChange: "transform, opacity",
                }
              : {
                  position: "absolute",
                  top: 0,
                  height: 0,
                  opacity: 0,
                  pointerEvents: "none",
                  visibility: "hidden",
                };

            return (
              <div
                key={piece.uuid}
                style={style}
                data-index={index}
                data-visible={isVisible ? "true" : "false"}
              >
                <KeepAliveRow
                  piece={piece}
                  originalId={piece.uuid}
                  onChange={onChange}
                  onDelete={onDelete}
                  columnWidths={columnWidths}
                  rowOptions={rowOptions}
                  virtualizer={extendedVirtualizer}
                  visualizerUtils={visualizerUtils}
                  index={index}
                  isVisible={isVisible}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
