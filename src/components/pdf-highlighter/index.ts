// Main component
export { PDFHighlighterViewer } from "./PDFHighlighterViewer";

// Sub-components
export { HighlightTip } from "./HighlightTip";

// Types
export type {
  DeepReadHighlight,
  NewHighlightData,
  PDFHighlighterViewerProps,
  PageDimensions,
  PageDimensionsMap,
  TipConfig,
  HighlightTipProps,
  HighlightPopupProps,
  CitationFlashProps,
} from "./types";

// Utils
export {
  scaledPositionToRects,
  rectsToScaledPosition,
  mergeAdjacentRects,
  getPositionCenter,
} from "./utils/position-converter";

export {
  supabaseToRphHighlight,
  supabaseHighlightsToRph,
  rphToCreateHighlightRequest,
  findOriginalHighlight,
  generateHighlightId,
  highlightsOverlap,
} from "./utils/highlight-adapter";
