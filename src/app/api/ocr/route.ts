import { NextRequest, NextResponse } from "next/server";
import { extractTextWithOlmOCR } from "@/lib/ocr/olmocr-client";
import { parseOCRToPageLayout } from "@/lib/ocr/layout-parser";

export const maxDuration = 60; // Allow up to 60 seconds for OCR processing

interface OCRRequestBody {
  image: string; // Base64 encoded image
  pageNumber: number;
  totalPages: number;
  width: number;
  height: number;
}

/**
 * POST /api/ocr
 * Process a PDF page image with OCR and return structured layout
 */
export async function POST(request: NextRequest) {
  try {
    const body: OCRRequestBody = await request.json();

    const { image, pageNumber, totalPages, width, height } = body;

    if (!image) {
      return NextResponse.json({ error: "Image is required" }, { status: 400 });
    }

    if (!pageNumber || !totalPages) {
      return NextResponse.json(
        { error: "Page metadata is required" },
        { status: 400 },
      );
    }

    // Check if DeepInfra API key is configured
    if (!process.env.DEEPINFRA_API) {
      return NextResponse.json(
        {
          error: "OCR service not configured. Set DEEPINFRA_API env variable.",
        },
        { status: 503 },
      );
    }

    // Call OCR with DeepInfra
    const ocrResult = await extractTextWithOlmOCR({
      image,
      metadata: {
        pageNumber,
        totalPages,
        width,
        height,
      },
    });

    // Parse markdown to layout
    const layout = parseOCRToPageLayout(
      ocrResult.markdown,
      pageNumber,
      width,
      height,
    );

    return NextResponse.json({
      success: true,
      layout,
      markdown: ocrResult.markdown,
      usage: ocrResult.usage,
    });
  } catch (error) {
    console.error("OCR processing error:", error);

    const errorMessage =
      error instanceof Error ? error.message : "OCR processing failed";

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/ocr
 * Check if OCR service is available
 */
export async function GET() {
  const available = !!process.env.DEEPINFRA_API;

  return NextResponse.json({
    available,
    provider: "deepinfra",
    model: process.env.DEEPINFRA_MODEL || "allenai/olmOCR-2-7B-1025",
  });
}
