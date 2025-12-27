"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import type { MistralPage, MistralImage } from "@/lib/mistral-ocr/types";

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
  /** URL of the PDF file */
  pdfUrl: string;
  /** Initial scale */
  initialScale?: number;
  /** CSS classes */
  className?: string;
}

/**
 * SmartPDFViewer
 *
 * PDF viewer with Mistral OCR-based text extraction:
 * - Markdown rendering for text content
 * - Image extraction with positioning
 * - No canvas PDF rendering (cleaner display)
 */
export function SmartPDFViewer({
  pdfUrl,
  initialScale = 1,
  className,
}: SmartPDFViewerProps) {
  // Core state
  const [scale, setScale] = useState(initialScale);
  const [pages, setPages] = useState<MistralPage[]>([]);

  // Processing state
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mistralStatus, setMistralStatus] =
    useState<MistralServiceStatus | null>(null);
  const [progress, setProgress] = useState(0);

  // Refs
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

  // Process PDF with Mistral when service is ready
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
        // Call Mistral OCR API with PDF URL
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

  // Zoom controls
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.1, 2));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.1, 0.5));

  return (
    <div className={cn("smart-pdf-viewer flex flex-col h-full", className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut}>
            -
          </Button>
          <span className="text-sm w-16 text-center">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="outline" size="sm" onClick={handleZoomIn}>
            +
          </Button>
        </div>

        <div className="flex items-center gap-4">
          {/* Status indicator */}
          {status === "checking" && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Vérification Mistral...</span>
            </div>
          )}

          {status === "processing" && (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                Traitement OCR...
              </span>
              <Progress value={progress} className="w-24" />
            </div>
          )}

          {status === "completed" && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">{pages.length} pages</span>
            </div>
          )}

          {(status === "error" || mistralStatus?.available === false) && (
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                {errorMessage || "Mistral indisponible"}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Pages container */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-muted/50">
        <div className="flex flex-col items-center gap-6 py-6 px-4">
          {status === "processing" && pages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <span className="text-muted-foreground">
                Analyse du document en cours...
              </span>
              <Progress value={progress} className="w-48" />
            </div>
          )}

          {pages.map((page) => (
            <PageRenderer
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
 * Page Renderer Component
 * Renders a single page with markdown content and images
 */
interface PageRendererProps {
  page: MistralPage;
  scale: number;
  pageNumber: number;
  totalPages: number;
}

function PageRenderer({
  page,
  scale,
  pageNumber,
  totalPages,
}: PageRendererProps) {
  // Calculate scaled dimensions
  const baseWidth = page.dimensions?.width || 800;
  const scaledWidth = baseWidth * scale;

  return (
    <div
      className="bg-white shadow-lg rounded-sm overflow-hidden"
      style={{
        width: Math.max(scaledWidth, 600),
        maxWidth: "100%",
      }}
    >
      {/* Page content */}
      <div
        className="p-8"
        style={{
          fontSize: `${14 * scale}px`,
          lineHeight: 1.6,
        }}
      >
        {/* Images from Mistral */}
        {page.images && page.images.length > 0 && (
          <div className="mb-6">
            {page.images.map((img) => (
              <MistralImageRenderer key={img.id} image={img} scale={scale} />
            ))}
          </div>
        )}

        {/* Markdown content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <ReactMarkdown
            components={{
              // Custom heading styles
              h1: ({ children }) => (
                <h1 className="text-2xl font-bold mb-4 text-foreground">
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-xl font-semibold mb-3 text-foreground">
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-lg font-medium mb-2 text-foreground">
                  {children}
                </h3>
              ),
              // Custom paragraph
              p: ({ children }) => (
                <p className="mb-4 text-foreground leading-relaxed">
                  {children}
                </p>
              ),
              // Custom list styles
              ul: ({ children }) => (
                <ul className="list-disc pl-6 mb-4 space-y-1">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-6 mb-4 space-y-1">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-foreground">{children}</li>
              ),
              // Custom table
              table: ({ children }) => (
                <div className="overflow-x-auto mb-4">
                  <table className="min-w-full border-collapse border border-border">
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border bg-muted px-3 py-2 text-left font-semibold">
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border px-3 py-2">{children}</td>
              ),
              // Code blocks
              code: ({ children, className }) => {
                const isInline = !className;
                return isInline ? (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
                    {children}
                  </code>
                ) : (
                  <code className="block bg-muted p-4 rounded overflow-x-auto font-mono text-sm">
                    {children}
                  </code>
                );
              },
              // Blockquote
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground mb-4">
                  {children}
                </blockquote>
              ),
            }}
          >
            {page.markdown}
          </ReactMarkdown>
        </div>
      </div>

      {/* Page footer */}
      <div className="border-t border-border px-8 py-2 bg-muted/30 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">
          Page {pageNumber} / {totalPages}
        </span>
        {page.dimensions && (
          <span className="text-xs text-muted-foreground">
            {page.dimensions.width} x {page.dimensions.height} @{" "}
            {page.dimensions.dpi}dpi
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Mistral Image Renderer
 * Renders an extracted image with optional positioning
 */
interface MistralImageRendererProps {
  image: MistralImage;
  scale: number;
}

function MistralImageRenderer({ image, scale }: MistralImageRendererProps) {
  if (!image.image_base64) {
    return null;
  }

  const width = (image.bottom_right_x - image.top_left_x) * scale;
  const height = (image.bottom_right_y - image.top_left_y) * scale;

  return (
    <div className="my-4 flex justify-center">
      <img
        src={`data:image/jpeg;base64,${image.image_base64}`}
        alt={`Image ${image.id}`}
        className="max-w-full h-auto rounded shadow-sm"
        style={{
          maxWidth: Math.min(width, 800),
          maxHeight: Math.min(height, 600),
        }}
      />
    </div>
  );
}

export default SmartPDFViewer;
