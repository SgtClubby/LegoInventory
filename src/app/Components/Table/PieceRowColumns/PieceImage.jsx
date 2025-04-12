// src/app/Components/Table/PieceRowColumns/PieceImage.jsx
import { useState, useEffect, useRef } from "react";

export default function PieceImage({ piece, colBase, columnWidths }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  const { availableColors, elementName } = piece;

  const elementImage =
    availableColors?.find((color) => color.colorId == piece.elementColorId)
      ?.elementImage || null;
  // Create image URL, with fallback handling
  const resizedImage = elementImage
    ? (elementImage + "/48x48p.jpg").replace("parts", "thumbs/parts")
    : null;

  // Check if image is already in cache when component mounts
  useEffect(() => {
    if (elementImage && imgRef.current) {
      // If image is already in browser cache, 'complete' will be true immediately
      if (imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
        setLoaded(true);
      }
    }

    // Reset loading state when image changes
    return () => {
      setLoaded(false);
    };
  }, [elementImage]);

  return (
    <div className={`${colBase} ${columnWidths.image}`}>
      {/* Placeholder/loader shown until image is loaded */}
      {!loaded && elementImage && (
        <div className="w-12 h-12 bg-gray-300 animate-pulse rounded" />
      )}

      {elementImage ? (
        <img
          ref={imgRef}
          src={resizedImage}
          alt={elementName || "LEGO piece"}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)} // Don't keep showing loading state if image fails
          decoding="async"
          fetchPriority="low"
          className={`opacity-50 w-12 h-12 object-cover rounded transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          // className="{`"opacity-50 w-12 h-12 object-cover rounded transition-opacity duration-200"
        />
      ) : (
        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-gray-400">
          <span className="text-xs">No img</span>
        </div>
      )}
    </div>
  );
}
