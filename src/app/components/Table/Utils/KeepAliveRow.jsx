import { useRef, useEffect, useMemo } from "react";
import PieceRow from "../PieceRow";

export default function KeepAliveRow({
  piece,
  originalId,
  onChange,
  onDelete,
  columnWidths,
  rowOptions,
  virtualizer,
  visualizerUtils,
  index,
  isVisible,
}) {
  const rowRef = useRef(null);

  // Render the row once and cache its DOM node
  useEffect(() => {
    if (rowRef.current) {
      // Store this DOM node reference in parent component's cache
      visualizerUtils.registerKeepAliveNode(originalId, rowRef.current);
    }

    return () => {
      // Clean up if component is ever unmounted
      visualizerUtils.unregisterKeepAliveNode(originalId);
    };
  }, [originalId, visualizerUtils]);

  // Use memo to reduce re-renders
  const memoizedPieceRow = useMemo(() => {
    return (
      <PieceRow
        piece={piece}
        originalId={originalId}
        onChange={onChange}
        onDelete={onDelete}
        columnWidths={columnWidths}
        rowOptions={rowOptions}
        virtualizer={virtualizer}
        index={index}
      />
    );
  }, [
    piece,
    originalId,
    onChange,
    onDelete,
    columnWidths,
    rowOptions,
    virtualizer,
    index,
  ]);

  return (
    <div ref={rowRef} className={isVisible ? "visible-row" : "hidden-row"}>
      {memoizedPieceRow}
    </div>
  );
}
