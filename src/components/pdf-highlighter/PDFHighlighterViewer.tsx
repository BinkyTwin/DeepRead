"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type {
  IHighlight,
  ScaledPosition,
  Content,
} from "react-pdf-highlighter";
import { PdfLoader, PdfHighlighter, Tip } from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";

import type {
  Highlight as SupabaseHighlight,
  HighlightColor,
} from "@/types/highlight";
import type {
  PDFHighlighterViewerProps,
  DeepReadHighlight,
  PageDimensionsMap,
} from "./types";
import { HighlightTip } from "./HighlightTip";
import {
  supabaseHighlightsToRph,
  rphToCreateHighlightRequest,
  findOriginalHighlight,
} from "./utils/highlight-adapter";

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
}

export function PDFHighlighterViewer({
  pdfUrl,
  paperId,
  highlights = [],
  activeCitation,
  onHighlightCreate,
  onHighlightClick,
  onHighlightDelete,
  onAskSelection,
  onTranslateSelection,
  scrollToHighlightRef,
  className,
}: PDFHighlighterViewerProps) {
  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scrollViewerTo = useRef<(highlight: any) => void>(() => {});
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [pageDimensions, setPageDimensions] = useState<PageDimensionsMap>(
    new Map(),
  );
  const [citationFlashRects, setCitationFlashRects] = useState<{
    pageNumber: number;
    rects: Array<{ x: number; y: number; width: number; height: number }>;
  } | null>(null);

  // Convert Supabase highlights to react-pdf-highlighter format
  const rphHighlights = useMemo(() => {
    if (pageDimensions.size === 0) return [];
    return supabaseHighlightsToRph(highlights, pageDimensions);
  }, [highlights, pageDimensions]);

  // Handle scroll to highlight (exposed via ref)
  useEffect(() => {
    if (scrollToHighlightRef) {
      scrollToHighlightRef.current = (highlightId: string) => {
        const highlight = rphHighlights.find((h) => h.id === highlightId);
        if (highlight) {
          scrollViewerTo.current(highlight);
        }
      };
    }
  }, [rphHighlights, scrollToHighlightRef]);

  // Handle citation flash
  useEffect(() => {
    if (!activeCitation) {
      setCitationFlashRects(null);
      return;
    }

    // For now, we'll show a simple flash based on the citation
    // In a full implementation, we'd convert citation offsets to rects
    const timer = setTimeout(() => {
      setCitationFlashRects(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [activeCitation]);

  // Handle new highlight creation
  const handleAddHighlight = useCallback(
    (position: ScaledPosition, content: Content, color: HighlightColor) => {
      const dimensions = pageDimensions.get(position.pageNumber);
      if (!dimensions) return;

      const request = rphToCreateHighlightRequest(
        position,
        content,
        color,
        paperId,
        dimensions,
      );

      // Create a temporary highlight object for the callback
      const tempHighlight: SupabaseHighlight = {
        id: `temp-${Date.now()}`,
        ...request,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onHighlightCreate?.(tempHighlight);
    },
    [pageDimensions, paperId, onHighlightCreate],
  );

  // Store page dimensions when PDF loads
  const updatePageDimensions = useCallback(
    (pageNumber: number, width: number, height: number) => {
      setPageDimensions((prev) => {
        const next = new Map(prev);
        next.set(pageNumber, { width, height });
        return next;
      });
    },
    [],
  );

  return (
    <div
      ref={containerRef}
      className={`h-full w-full relative ${className || ""}`}
    >
      <PdfLoader url={pdfUrl} beforeLoad={<LoadingSpinner />}>
        {(pdfDocument) => (
          <PdfHighlighter
            pdfDocument={pdfDocument}
            enableAreaSelection={(event) => event.altKey}
            scrollRef={(scrollTo) => {
              scrollViewerTo.current = scrollTo;
            }}
            onScrollChange={() => {
              // Reset hash when user scrolls
            }}
            pdfScaleValue="page-width"
            highlights={rphHighlights}
            onSelectionFinished={(
              position,
              content,
              hideTipAndSelection,
              transformSelection,
            ) => {
              // Store page dimensions if not already stored
              if (!pageDimensions.has(position.pageNumber)) {
                const { width, height } = position.boundingRect;
                // Estimate page dimensions from selection
                updatePageDimensions(
                  position.pageNumber,
                  width * 10,
                  height * 10,
                );
              }

              return (
                <HighlightTip
                  content={content}
                  pageNumber={position.pageNumber}
                  onConfirm={(color) => {
                    handleAddHighlight(position, content, color);
                    hideTipAndSelection();
                  }}
                  onAsk={
                    onAskSelection
                      ? () => {
                          onAskSelection(
                            content.text || "",
                            position.pageNumber,
                          );
                          hideTipAndSelection();
                        }
                      : undefined
                  }
                  onTranslate={
                    onTranslateSelection
                      ? () => {
                          onTranslateSelection(
                            content.text || "",
                            position.pageNumber,
                          );
                          hideTipAndSelection();
                        }
                      : undefined
                  }
                  onDismiss={hideTipAndSelection}
                />
              );
            }}
            highlightTransform={(
              highlight,
              index,
              setTip,
              hideTip,
              viewportToScaled,
              screenshot,
              isScrolledTo,
            ) => {
              const drHighlight = highlight as DeepReadHighlight;

              // Simple highlight rendering using the library's default
              // We pass our custom data through and let the library handle rendering
              return (
                <div
                  key={drHighlight.id}
                  onClick={() => {
                    const original = findOriginalHighlight(
                      drHighlight.id,
                      highlights,
                    );
                    if (original) {
                      onHighlightClick?.(original);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                />
              );
            }}
          />
        )}
      </PdfLoader>

      {/* Citation flash overlay */}
      {citationFlashRects && (
        <div className="absolute inset-0 pointer-events-none z-50">
          {citationFlashRects.rects.map((rect, i) => (
            <div
              key={i}
              className="absolute highlight-orange citation-flash"
              style={{
                left: `${rect.x * 100}%`,
                top: `${rect.y * 100}%`,
                width: `${rect.width * 100}%`,
                height: `${rect.height * 100}%`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
