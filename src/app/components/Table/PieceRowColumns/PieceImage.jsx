import { useState, useEffect, useRef } from "react";

export default function PieceImage({ piece, colBase, columnWidths }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef(null);
  const { elementImage, elementName } = piece;

  const resizedImage = elementImage
    ? (elementImage + "/48x48p.jpg").replace("parts", "thumbs/parts")
    : null;

  // Check if image is already in cache when component mounts
  useEffect(() => {
    if (elementImage && imgRef.current) {
      // If image is already cached, browser may not trigger onLoad
      if (imgRef.current.complete) {
        setLoaded(true);
      }
    }
    return () => {
      // Cleanup to prevent memory leaks
      setLoaded(false);
    };
  }, [elementImage]);

  return (
    <div
      className={`${colBase} ${columnWidths.image} flex items-center justify-center flex-shrink-0 relative`}
    >
      {!loaded && elementImage && (
        <div className="w-12 h-12 bg-white animate-pulse rounded absolute" />
      )}
      {elementImage ? (
        <>
          <div className="w-12 h-12 bg-white absolute rounded" />
          <img
            ref={imgRef}
            src={resizedImage}
            alt={elementName}
            onLoad={() => setLoaded(true)}
            decoding="async"
            fetchPriority="low"
            loading="eager"
            className={`w-12 h-12 object-cover rounded transition-opacity duration-300 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            style={{
              contentVisibility: "auto",
              containIntrinsicSize: "48px 48px",
            }}
          />
        </>
      ) : (
        <div className="w-12 h-12 bg-gray-700 rounded flex items-center justify-center text-gray-500">
          <span className="text-xs">No img</span>
        </div>
      )}
    </div>
  );
}
