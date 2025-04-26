"use client";

import { useRef } from "react";
import { useSigmaGraph } from "@/hooks/useSigmaGraph";

export const GraphContainer = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useSigmaGraph(containerRef);

  return <div ref={containerRef} className="flex-1 relative" />;
};

