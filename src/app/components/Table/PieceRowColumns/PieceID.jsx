import bricklinkMap from "@/colors/bricklinkMap.js";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";

export default function PieceID({
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
    <div className={`${colBase} ${columnWidths.id} flex-1`}>
      <div className="flex items-center">
        <input
          type="text"
          value={elementId}
          onChange={(e) =>
            onChange("elementId", originalId, e.target.value || 0)
          }
          className="w-full bg-transparent border-0 focus:border-blue-500 focus:ring-0 text-gray-200"
        />
        <a
          href={`https://www.bricklink.com/v2/catalog/catalogitem.page?P=${elementId}&idColor=${bricklinkMap[elementColor]}#T=C&C=63`}
          target="_blank"
          rel="noreferrer"
          className="ml-2 text-blue-500 hover:text-blue-700 flex-shrink-0"
          title="View on BrickLink"
        >
          <OpenInNewOutlinedIcon fontSize="small" />
        </a>
      </div>
    </div>
  );
}
