// src/app/Components/Table/PieceRowColumns/PieceInventory.jsx

export default function PieceInventory({
  piece,
  colBase,
  columnWidths,
  onChange,
  originalId,
}) {
  const {
    elementId,
    elementName,
    elementColor,
    elementImage,
    elementQuantityOnHand,
    elementQuantityRequired,
    countComplete,
  } = piece;

  return (
    <>
      <div className={`${colBase} ${columnWidths.onHand} flex-1`}>
        <input
          type="number"
          min="0"
          value={elementQuantityOnHand}
          onChange={(e) => {
            const newValue = parseInt(e.target.value) || 0;
            const willBeComplete =
              elementQuantityRequired !== 0 &&
              newValue >= elementQuantityRequired;
            if (willBeComplete) e.target.blur();
            onChange(originalId, "elementQuantityOnHand", newValue);
          }}
          className="w-16 bg-transparent border-0 focus:border-blue-500 focus:ring-0 text-gray-200"
        />
      </div>

      <div className={`${colBase} ${columnWidths.required} flex-1`}>
        <input
          type="number"
          min="0"
          value={elementQuantityRequired}
          onChange={(e) => {
            const newValue = parseInt(e.target.value) || 0;
            const willBeComplete =
              elementQuantityOnHand !== 0 && newValue <= elementQuantityOnHand;
            if (willBeComplete) e.target.blur();
            onChange(originalId, "elementQuantityRequired", newValue);
          }}
          className="w-16 bg-transparent border-0 focus:border-blue-500 focus:ring-0 text-gray-200"
        />
      </div>
    </>
  );
}
