// src/app/Components/Table/PieceRowColumns/PieceName.jsx

export default function PieceName({
  piece,
  colBase,
  columnWidths,
  onChange,
  originalId,
}) {
  const { elementName } = piece;

  return (
    <div className={`${colBase} ${columnWidths.name} flex-1`}>
      <input
        type="text"
        value={elementName}
        onChange={(e) => onChange(originalId, "elementName", e.target.value)}
        className="w-full bg-transparent border-0 focus:border-blue-500 focus:ring-0 text-gray-200"
      />
    </div>
  );
}
