// src/app/components/Table/PieceRowColumns/PieceID.jsx

export default function PieceID({
  piece,
  colBase,
  columnWidths,
  onChange,
  originalId,
}) {
  const { elementId, elementColor } = piece;

  return (
    <div className={`${colBase} ${columnWidths.id}`}>
      <input
        type="text"
        value={elementId}
        onChange={(e) => onChange("elementId", originalId, e.target.value || 0)}
        className="w-full bg-transparent border-0 focus:border-blue-500 focus:ring-0 text-gray-200"
      />
    </div>
  );
}
