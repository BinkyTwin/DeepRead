"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { MistralPage } from "@/lib/mistral-ocr/types";

// Extended schema to allow tables and common HTML elements
const sanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames || []),
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
    "figure",
    "figcaption",
  ],
  attributes: {
    ...defaultSchema.attributes,
    table: ["className"],
    th: ["colspan", "rowspan", "className"],
    td: ["colspan", "rowspan", "className"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
  },
};

interface MistralServiceStatus {
  available: boolean;
  provider: string;
  model: string;
}

type ProcessingStatus =
  | "idle"
  | "checking"
  | "processing"
  | "completed"
  | "error";

interface SmartPDFViewerProps {
  pdfUrl: string;
  initialScale?: number;
  className?: string;
}

/**
 * SmartPDFViewer - Mistral OCR-based PDF viewer
 */
export function SmartPDFViewer({
  pdfUrl,
  initialScale = 1,
  className,
}: SmartPDFViewerProps) {
  const [scale, setScale] = useState(initialScale);
  const [pages, setPages] = useState<MistralPage[]>([]);
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mistralStatus, setMistralStatus] =
    useState<MistralServiceStatus | null>(null);
  const [progress, setProgress] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const processedRef = useRef(false);

  // Check Mistral service availability
  useEffect(() => {
    const checkMistral = async () => {
      setStatus("checking");
      try {
        const response = await fetch("/api/mistral-ocr");
        if (response.ok) {
          const data: MistralServiceStatus = await response.json();
          setMistralStatus(data);
          if (!data.available) {
            setErrorMessage("Mistral OCR not configured");
          }
        } else {
          setMistralStatus({
            available: false,
            provider: "mistral",
            model: "",
          });
          setErrorMessage("Failed to check Mistral service");
        }
      } catch {
        setMistralStatus({ available: false, provider: "mistral", model: "" });
        setErrorMessage("Cannot connect to API");
      }
      setStatus("idle");
    };
    checkMistral();
  }, []);

  // Process PDF with Mistral
  useEffect(() => {
    if (
      !pdfUrl ||
      !mistralStatus?.available ||
      status === "processing" ||
      status === "completed" ||
      status === "error" ||
      processedRef.current
    ) {
      return;
    }

    const processWithMistral = async () => {
      processedRef.current = true;
      setStatus("processing");
      setErrorMessage(null);
      setProgress(10);

      try {
        const response = await fetch("/api/mistral-ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentUrl: pdfUrl,
            includeImages: true,
          }),
        });

        setProgress(50);

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Mistral OCR processing failed");
        }

        const result = await response.json();
        setProgress(90);

        setPages(result.pages || []);
        setStatus("completed");
        setProgress(100);
      } catch (error) {
        console.error("Mistral OCR processing failed:", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Processing failed",
        );
        setStatus("error");
        processedRef.current = false;
      }
    };

    processWithMistral();
  }, [pdfUrl, mistralStatus?.available, status]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.1, 2));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.1, 0.5));

  return (
    <div className={cn("smart-pdf-viewer flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm w-16 text-center font-medium">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={scale >= 2}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {status === "checking" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Vérification...</span>
            </div>
          )}

          {status === "processing" && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Analyse OCR...
              </span>
              <Progress value={progress} className="w-24" />
            </div>
          )}

          {status === "completed" && (
            <div className="flex items-center gap-2 text-green-500">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">{pages.length} pages</span>
            </div>
          )}

          {(status === "error" || mistralStatus?.available === false) && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{errorMessage || "Erreur"}</span>
            </div>
          )}
        </div>
      </div>

      {/* Pages container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto"
        style={{ backgroundColor: "#525659" }}
      >
        <div className="flex flex-col items-center gap-8 py-8 px-4">
          {status === "processing" && pages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-16">
              <Loader2 className="h-16 w-16 animate-spin text-primary" />
              <span className="text-white/80 text-lg">
                Analyse du document...
              </span>
              <Progress value={progress} className="w-64" />
            </div>
          )}

          {pages.map((page) => (
            <PageCanvas
              key={page.index}
              page={page}
              scale={scale}
              pageNumber={page.index + 1}
              totalPages={pages.length}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Page Canvas Component - Renders a page like a document canvas
 */
interface PageCanvasProps {
  page: MistralPage;
  scale: number;
  pageNumber: number;
  totalPages: number;
}

function PageCanvas({ page, scale, pageNumber, totalPages }: PageCanvasProps) {
  // Build image map for replacing markdown image references
  const imageMap = useMemo(() => {
    const map = new Map<string, string>();
    if (page.images) {
      for (const img of page.images) {
        if (img.image_base64) {
          // Map both with and without extension
          const baseName = img.id.replace(/\.(jpeg|jpg|png|gif|webp)$/i, "");
          map.set(img.id, `data:image/jpeg;base64,${img.image_base64}`);
          map.set(baseName, `data:image/jpeg;base64,${img.image_base64}`);
          // Also map simple patterns like img-0, img-1
          map.set(
            img.id.toLowerCase(),
            `data:image/jpeg;base64,${img.image_base64}`,
          );
        }
      }
    }
    return map;
  }, [page.images]);

  // Process markdown to replace image references with base64
  const processedMarkdown = useMemo(() => {
    let md = page.markdown || "";

    // Replace image references with base64 data URIs
    // Pattern: ![alt](filename) or ![](filename)
    md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, src) => {
      // Try to find the image in our map
      const dataUri =
        imageMap.get(src) ||
        imageMap.get(src.toLowerCase()) ||
        imageMap.get(src.replace(/^\.?\//, ""));

      if (dataUri) {
        return `![${alt}](${dataUri})`;
      }
      // If not found, keep original (might be external URL)
      return match;
    });

    return md;
  }, [page.markdown, imageMap]);

  // Calculate dimensions
  const baseWidth = page.dimensions?.width || 800;
  const baseHeight = page.dimensions?.height || 1100;
  const dpi = page.dimensions?.dpi || 200;

  // Scale to reasonable screen size (assuming 96 screen DPI)
  const screenScale = 96 / dpi;
  const width = baseWidth * screenScale * scale;

  return (
    <div
      className="bg-white rounded shadow-2xl overflow-hidden"
      style={{
        width: Math.max(width, 600),
        maxWidth: "95vw",
        minHeight: 400,
      }}
    >
      {/* Page content area */}
      <article
        className="p-8 md:p-12"
        style={{
          fontSize: `${16 * scale}px`,
        }}
      >
        {/* Render markdown with proper typography */}
        <div className="prose prose-slate max-w-none prose-headings:text-slate-900 prose-p:text-slate-800 prose-li:text-slate-800 prose-strong:text-slate-900 prose-a:text-primary hover:prose-a:text-primary/80">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw, [rehypeSanitize, sanitizeSchema]]}
            components={{
              // Custom image handling
              img: ({ src, alt, ...props }) => {
                // Check if we need to resolve from imageMap
                const resolvedSrc =
                  imageMap.get(src || "") ||
                  imageMap.get((src || "").toLowerCase()) ||
                  src;

                return (
                  <span className="block my-6">
                    <img
                      src={resolvedSrc}
                      alt={alt || ""}
                      className="max-w-full h-auto rounded-lg shadow-md mx-auto"
                      loading="lazy"
                      {...props}
                    />
                    {alt && (
                      <span className="block text-center text-sm text-slate-500 mt-2 italic">
                        {alt}
                      </span>
                    )}
                  </span>
                );
              },
              // Tables with proper styling
              table: ({ children }) => (
                <div className="overflow-x-auto my-6 rounded-lg border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => (
                <thead className="bg-slate-50">{children}</thead>
              ),
              th: ({ children }) => (
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="px-4 py-3 text-sm text-slate-700 border-t border-slate-100">
                  {children}
                </td>
              ),
              // Headings
              h1: ({ children }) => (
                <h1 className="text-3xl font-bold text-slate-900 mb-6 mt-8 first:mt-0">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-2xl font-semibold text-slate-900 mb-4 mt-8">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-xl font-semibold text-slate-800 mb-3 mt-6">
                  {children}
                </h3>
              ),
              // Paragraphs
              p: ({ children }) => (
                <p className="text-slate-800 leading-relaxed mb-4">
                  {children}
                </p>
              ),
              // Lists
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-2 text-slate-800">
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-2 text-slate-800">
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li className="text-slate-800 leading-relaxed">{children}</li>
              ),
              // Code
              code: ({ children, className }) => {
                const isBlock = className?.includes("language-");
                return isBlock ? (
                  <code className="block bg-slate-900 text-slate-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                );
              },
              pre: ({ children }) => (
                <pre className="my-4 overflow-x-auto">{children}</pre>
              ),
              // Blockquote
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-slate-50 rounded-r-lg italic text-slate-700">
                  {children}
                </blockquote>
              ),
              // Links
              a: ({ href, children }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 underline underline-offset-2"
                >
                  {children}
                </a>
              ),
              // Horizontal rule
              hr: () => <hr className="my-8 border-slate-200" />,
            }}
          >
            {processedMarkdown}
          </ReactMarkdown>
        </div>
      </article>

      {/* Page footer */}
      <div className="border-t border-slate-200 px-8 py-3 bg-slate-50 flex justify-between items-center">
        <span className="text-sm font-medium text-slate-600">
          Page {pageNumber} / {totalPages}
        </span>
        {page.dimensions && (
          <span className="text-xs text-slate-400">
            {baseWidth} × {baseHeight} @ {dpi}dpi
          </span>
        )}
      </div>
    </div>
  );
}

export default SmartPDFViewer;
