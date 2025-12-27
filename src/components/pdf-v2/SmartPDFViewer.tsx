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
// Note: rehype-sanitize removed - it was stripping data URIs for images
import type { MistralPage } from "@/lib/mistral-ocr/types";

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
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Page Canvas Component - Renders a page like real A4 paper
 */
interface PageCanvasProps {
  page: MistralPage;
  scale: number;
  pageNumber: number;
}

// A4 dimensions in pixels at 96 DPI (standard screen)
const A4_WIDTH_PX = 794; // 210mm at 96 DPI
const A4_HEIGHT_PX = 1123; // 297mm at 96 DPI

function PageCanvas({ page, scale, pageNumber }: PageCanvasProps) {
  // Build image map for replacing markdown image references
  const imageMap = useMemo(() => {
    const map = new Map<string, string>();
    if (page.images) {
      for (const img of page.images) {
        if (img.image_base64) {
          // Map multiple variations of the image name
          const baseName = img.id.replace(/\.(jpeg|jpg|png|gif|webp)$/i, "");

          // Check if base64 already has data URI prefix
          const dataUri = img.image_base64.startsWith("data:")
            ? img.image_base64
            : `data:image/jpeg;base64,${img.image_base64}`;

          map.set(img.id, dataUri);
          map.set(baseName, dataUri);
          map.set(img.id.toLowerCase(), dataUri);
          map.set(baseName.toLowerCase(), dataUri);
          // Handle paths like ./img-0.jpeg
          map.set(`./${img.id}`, dataUri);
        }
      }
    }
    return map;
  }, [page.images]);

  // Just use the raw markdown - image resolution happens in the img component
  const processedMarkdown = page.markdown || "";

  // Calculate scaled dimensions
  const scaledWidth = A4_WIDTH_PX * scale;
  const scaledHeight = A4_HEIGHT_PX * scale;

  return (
    <div
      className="relative bg-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
      style={{
        width: scaledWidth,
        minHeight: scaledHeight,
        maxWidth: "95vw",
      }}
    >
      {/* Page content */}
      <article
        className="relative"
        style={{
          padding: `${48 * scale}px ${56 * scale}px`,
          fontSize: `${14 * scale}px`,
          lineHeight: 1.6,
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeRaw]}
          components={{
            // Images - resolve from imageMap and render full width
            img: ({ src, alt }) => {
              const originalSrc = src || "";
              const cleanSrc = originalSrc.replace(/^\.?\//, "");

              // Try to resolve from imageMap
              const resolvedSrc =
                imageMap.get(originalSrc) ||
                imageMap.get(cleanSrc) ||
                imageMap.get(originalSrc.toLowerCase()) ||
                imageMap.get(cleanSrc.toLowerCase());

              if (!resolvedSrc) {
                // No image data available, show placeholder
                return (
                  <span className="block my-4 p-4 bg-slate-100 text-slate-500 text-center rounded">
                    Image: {alt || originalSrc}
                  </span>
                );
              }

              return (
                <span className="block my-4">
                  <img
                    src={resolvedSrc}
                    alt={alt || ""}
                    className="w-full h-auto"
                    style={{ maxWidth: "100%" }}
                    loading="lazy"
                  />
                </span>
              );
            },
            // Tables
            table: ({ children }) => (
              <div className="overflow-x-auto my-4">
                <table className="w-full border-collapse text-[0.85em]">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-slate-100 border-b-2 border-slate-300">
                {children}
              </thead>
            ),
            th: ({ children }) => (
              <th className="px-3 py-2 text-left font-semibold text-slate-900 border border-slate-200">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-3 py-2 text-slate-700 border border-slate-200">
                {children}
              </td>
            ),
            // Headings - professional document style
            h1: ({ children }) => (
              <h1 className="text-[1.8em] font-bold text-slate-900 mb-4 mt-6 first:mt-0 border-b-2 border-slate-200 pb-2">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-[1.4em] font-bold text-slate-800 mb-3 mt-5">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-[1.2em] font-semibold text-slate-800 mb-2 mt-4">
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4 className="text-[1.1em] font-semibold text-slate-700 mb-2 mt-3">
                {children}
              </h4>
            ),
            // Paragraphs
            p: ({ children }) => (
              <p className="text-slate-800 mb-3 text-justify">{children}</p>
            ),
            // Lists
            ul: ({ children }) => (
              <ul className="list-disc pl-5 mb-3 space-y-1 text-slate-800">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 mb-3 space-y-1 text-slate-800">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="text-slate-800">{children}</li>
            ),
            // Code
            code: ({ children, className }) => {
              const isBlock = className?.includes("language-");
              return isBlock ? (
                <code className="block bg-slate-100 text-slate-900 p-3 rounded text-[0.9em] font-mono overflow-x-auto">
                  {children}
                </code>
              ) : (
                <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[0.9em] font-mono">
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre className="my-3 overflow-x-auto">{children}</pre>
            ),
            // Blockquote
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-slate-300 pl-4 py-1 my-3 bg-slate-50 text-slate-700 italic">
                {children}
              </blockquote>
            ),
            // Links
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline"
              >
                {children}
              </a>
            ),
            // Horizontal rule
            hr: () => <hr className="my-6 border-slate-300" />,
            // Strong/bold
            strong: ({ children }) => (
              <strong className="font-bold text-slate-900">{children}</strong>
            ),
            // Emphasis/italic
            em: ({ children }) => <em className="italic">{children}</em>,
          }}
        >
          {processedMarkdown}
        </ReactMarkdown>
      </article>

      {/* Subtle page number at bottom */}
      <div
        className="absolute bottom-0 left-0 right-0 text-center pb-4 text-slate-400 text-xs"
        style={{ fontSize: `${10 * scale}px` }}
      >
        {pageNumber}
      </div>
    </div>
  );
}

export default SmartPDFViewer;
