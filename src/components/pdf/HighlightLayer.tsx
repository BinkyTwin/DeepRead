"use client";

import { useEffect, useState } from "react";
import { offsetsToRects } from "@/lib/highlight-renderer";
import type { Citation } from "@/types/citation";
import type { TextItem, HighlightRect } from "@/types/pdf";

interface HighlightLayerProps {
  citation: Citation;
  textItems: Map<number, TextItem[]>;
  pageRefs: Map<number, HTMLDivElement>;
  scale: number;
}

export function HighlightLayer({
  citation,
  textItems,
  pageRefs,
}: HighlightLayerProps) {
  const [rects, setRects] = useState<HighlightRect[]>([]);
  const [pageElement, setPageElement] = useState<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const pageTextItems = textItems.get(citation.page);
    if (!pageTextItems) {
      setRects([]);
      return;
    }

    const highlightRects = offsetsToRects(citation, pageTextItems);
    setRects(highlightRects);

    const element = pageRefs.get(citation.page);
    setPageElement(element || null);

    // Reset visibility
    setIsVisible(true);

    // Auto-hide after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [citation, textItems, pageRefs]);

  if (!pageElement || rects.length === 0 || !isVisible) {
    return null;
  }

  const pageRect = pageElement.getBoundingClientRect();

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {rects.map((rect, index) => (
        <div
          key={index}
          className="absolute highlight-orange animate-pulse rounded-sm"
          style={{
            left: pageRect.left + rect.x * pageRect.width,
            top: pageRect.top + rect.y * pageRect.height,
            width: rect.width * pageRect.width,
            height: rect.height * pageRect.height,
          }}
        />
      ))}
    </div>
  );
}
