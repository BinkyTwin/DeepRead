import type {
  IHighlight,
  ScaledPosition,
  Content,
} from "react-pdf-highlighter";
import type {
  Highlight,
  HighlightColor,
  HighlightRect,
} from "@/types/highlight";
import type { Citation } from "@/types/citation";

/**
 * Extension of IHighlight for DeepRead
 * Adds DeepRead-specific properties (color, offsets)
 */
export interface DeepReadHighlight extends IHighlight {
  /** Highlight color */
  color: HighlightColor;
  /** Character offsets for citation compatibility */
  startOffset?: number;
  endOffset?: number;
  /** Optional note */
  note?: string;
  /** Paper ID */
  paperId: string;
  /** Timestamps */
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Data for creating a new highlight
 */
export interface NewHighlightData {
  position: ScaledPosition;
  content: Content;
  color: HighlightColor;
  paperId: string;
  note?: string;
}

/**
 * Props for the main PDF viewer component
 */
export interface PDFHighlighterViewerProps {
  /** PDF URL to display */
  pdfUrl: string;
  /** Paper ID for highlights */
  paperId: string;
  /** Highlights loaded from Supabase */
  highlights?: Highlight[];
  /** Active citation to flash */
  activeCitation?: Citation | null;
  /** Callback when highlight is created */
  onHighlightCreate?: (highlight: Highlight) => void;
  /** Callback when highlight is clicked */
  onHighlightClick?: (highlight: Highlight) => void;
  /** Callback when highlight is deleted */
  onHighlightDelete?: (highlightId: string) => void;
  /** Callback when page changes */
  onPageChange?: (page: number) => void;
  /** Callback for "Ask" action on selection */
  onAskSelection?: (text: string, page: number) => void;
  /** Callback for "Translate" action on selection */
  onTranslateSelection?: (text: string, page: number) => void;
  /** Ref to scroll to a highlight (exposed for external navigation) */
  scrollToHighlightRef?: React.MutableRefObject<
    ((highlightId: string) => void) | null
  >;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Page dimensions for position conversion
 */
export interface PageDimensions {
  width: number;
  height: number;
}

/**
 * Map of page numbers to their dimensions
 */
export type PageDimensionsMap = Map<number, PageDimensions>;

/**
 * Tip configuration for highlight creation
 */
export interface TipConfig {
  /** Selected color */
  selectedColor: HighlightColor;
  /** Optional note */
  note: string;
}

/**
 * Props for HighlightTip component
 */
export interface HighlightTipProps {
  /** Selected content */
  content: Content;
  /** Current page number */
  pageNumber: number;
  /** Callback to confirm highlight creation */
  onConfirm: (color: HighlightColor, note?: string) => void;
  /** Callback for Ask action */
  onAsk?: () => void;
  /** Callback for Translate action */
  onTranslate?: () => void;
  /** Callback to dismiss the tip */
  onDismiss: () => void;
}

/**
 * Props for HighlightPopup component (on hover)
 */
export interface HighlightPopupProps {
  /** The highlight being hovered */
  highlight: DeepReadHighlight;
  /** Callback to edit the highlight */
  onEdit?: () => void;
  /** Callback to delete the highlight */
  onDelete?: () => void;
  /** Callback to add/edit note */
  onAddNote?: () => void;
}

/**
 * Props for CitationFlash component
 */
export interface CitationFlashProps {
  /** Citation to flash */
  citation: Citation;
  /** Rects to highlight (converted from citation) */
  rects: HighlightRect[];
  /** Page number */
  pageNumber: number;
  /** Callback when flash animation completes */
  onComplete?: () => void;
}
