// src/app/hooks/useBreakpoint.js

"use client";
import { useEffect, useState } from "react";

export default function useBreakpoints() {
  const [breakpoints, setBreakpoints] = useState({
    isSm: false,
    isMd: false,
    isLg: false,
    isXl: false,
    width: 0,
  });

  useEffect(() => {
    const update = () => {
      const width = window.innerWidth;
      setBreakpoints({
        width,
        isSm: width >= 640,
        isMd: width >= 768,
        isLg: width >= 1024,
        isXl: width >= 1280,
      });
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return breakpoints;
}
