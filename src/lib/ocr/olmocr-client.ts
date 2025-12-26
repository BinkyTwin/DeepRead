/**
 * olmOCR Client for DeepInfra
 *
 * Connects to DeepInfra API running olmOCR-2-7B-1025 model
 * API compatible with OpenAI /v1/chat/completions
 *
 * @see https://deepinfra.com/allenai/olmOCR-2-7B-1025/api
 */

import { OlmOCRRequest, OlmOCRResponse } from "./types";

const DEEPINFRA_URL = "https://api.deepinfra.com/v1/openai";

interface DeepInfraConfig {
  apiKey?: string;
  model?: string;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * olmOCR prompt template
 * Based on Allen AI's recommended format
 */
function buildOCRPrompt(metadata?: OlmOCRRequest["metadata"]): string {
  const pageInfo = metadata
    ? `Page ${metadata.pageNumber} of ${metadata.totalPages}. `
    : "";

  return `${pageInfo}Extract all text from this document image.
Output the content in clean markdown format, preserving:
- Document structure (headings, paragraphs, lists)
- Tables (use markdown table syntax)
- Mathematical equations (use LaTeX notation)
- Reading order (left-to-right, top-to-bottom, handling columns correctly)

Do not include any commentary or explanations, only the extracted text.`;
}

/**
 * Check if DeepInfra API is available
 * Server-side only - requires API key
 */
export async function checkDeepInfraAvailable(
  apiKey?: string,
): Promise<boolean> {
  const key = apiKey || process.env.DEEPINFRA_API;
  if (!key) return false;

  try {
    const response = await fetch(`${DEEPINFRA_URL}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${key}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Extract text from an image using olmOCR via DeepInfra
 * Server-side only - requires API key
 *
 * @param request - Image and metadata for OCR
 * @param config - DeepInfra configuration
 * @returns Markdown text extracted from the image
 */
export async function extractTextWithOlmOCR(
  request: OlmOCRRequest,
  config: DeepInfraConfig = {},
): Promise<OlmOCRResponse> {
  const apiKey = config.apiKey || process.env.DEEPINFRA_API;
  const model =
    config.model || process.env.DEEPINFRA_MODEL || "allenai/olmOCR-2-7B-1025";

  if (!apiKey) {
    throw new Error(
      "DeepInfra API key is required. Set DEEPINFRA_API env variable.",
    );
  }

  // Ensure image is properly formatted as data URL
  const imageUrl = request.image.startsWith("data:")
    ? request.image
    : `data:image/png;base64,${request.image}`;

  const prompt = buildOCRPrompt(request.metadata);

  const requestBody = {
    model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ],
    max_tokens: 4096,
    temperature: 0, // Deterministic output for OCR
  };

  const response = await fetch(`${DEEPINFRA_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `DeepInfra OCR failed: ${response.status} ${response.statusText} - ${errorText}`,
    );
  }

  const data: ChatCompletionResponse = await response.json();

  const markdown = data.choices[0]?.message?.content || "";

  return {
    markdown,
    usage: data.usage
      ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        }
      : undefined,
  };
}

/**
 * Process multiple pages in sequence
 */
export async function extractTextFromPages(
  pages: { pageNumber: number; imageBase64: string }[],
  totalPages: number,
  config: DeepInfraConfig = {},
  onProgress?: (pageNumber: number, total: number) => void,
): Promise<Map<number, OlmOCRResponse>> {
  const results = new Map<number, OlmOCRResponse>();

  for (const page of pages) {
    if (onProgress) {
      onProgress(page.pageNumber, totalPages);
    }

    const result = await extractTextWithOlmOCR(
      {
        image: page.imageBase64,
        metadata: {
          pageNumber: page.pageNumber,
          totalPages,
          width: 0, // Will be set by caller
          height: 0,
        },
      },
      config,
    );

    results.set(page.pageNumber, result);
  }

  return results;
}

/**
 * Create a client instance with pre-configured settings
 */
export function createOlmOCRClient(config: DeepInfraConfig = {}) {
  return {
    checkAvailable: () => checkDeepInfraAvailable(config.apiKey),
    extractText: (request: OlmOCRRequest) =>
      extractTextWithOlmOCR(request, config),
    extractPages: (
      pages: { pageNumber: number; imageBase64: string }[],
      totalPages: number,
      onProgress?: (pageNumber: number, total: number) => void,
    ) => extractTextFromPages(pages, totalPages, config, onProgress),
  };
}

export type OlmOCRClient = ReturnType<typeof createOlmOCRClient>;
