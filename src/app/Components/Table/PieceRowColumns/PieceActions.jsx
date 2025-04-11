// src/app/Components/Table/PieceRowColumns/PieceActions.jsx
export default function PieceActions({
  colBase,
  columnWidths,
  onDelete,
  highlighted,
  setHighlighted,
  originalId,
}) {
  return (
    <div className={`${colBase} ${columnWidths.actions} flex-1`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <input
            type="checkbox"
            className="w-4 h-4 mr-2"
            checked={highlighted}
            onChange={(e) => setHighlighted(e.target.checked)}
          />
          <span className="text-gray-200 text-xs">Highlight</span>
        </div>
        <button
          onClick={() => onDelete(originalId)}
          className="text-red-500 hover:text-red-700 ml-2"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
