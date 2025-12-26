import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCitations } from "@/lib/citations/validator";
import {
  CITATION_SYSTEM_PROMPT,
  buildPageContext,
} from "@/lib/citations/prompts";
import type { CitedResponse } from "@/types/citation";

interface ChatRequest {
  paperId: string;
  conversationId?: string;
  message: string;
  pages: Array<{ pageNumber: number; textContent: string }>;
  highlightContext?: {
    page: number;
    text: string;
  };
}

/**
 * POST /api/chat
 * Chat with a paper, returning citations
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const supabase = await createClient();

    // Build context from pages
    const context = buildPageContext(body.pages, body.highlightContext);

    // Limit context size (rough estimate: 4 chars per token, max ~8000 tokens for context)
    const maxContextLength = 32000;
    const truncatedContext =
      context.length > maxContextLength
        ? context.slice(0, maxContextLength) + "\n[...context truncated...]"
        : context;

    // Get conversation history if exists
    let messageHistory: Array<{ role: string; content: string }> = [];

    if (body.conversationId) {
      const { data: history } = await supabase
        .from("messages")
        .select("role, content")
        .eq("conversation_id", body.conversationId)
        .order("created_at", { ascending: true })
        .limit(10);

      if (history) {
        messageHistory = history.map((m) => ({
          role: m.role,
          content:
            m.role === "assistant"
              ? extractAnswerFromContent(m.content)
              : m.content,
        }));
      }
    }

    // Call LLM
    const llmResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/llm`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: CITATION_SYSTEM_PROMPT },
            {
              role: "user",
              content: `CONTEXTE DU PAPER:\n${truncatedContext}`,
            },
            ...messageHistory,
            { role: "user", content: body.message },
          ],
          temperature: 0.3,
          max_tokens: 2048,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!llmResponse.ok) {
      const error = await llmResponse.json();
      throw new Error(error.error || "LLM request failed");
    }

    const llmData = await llmResponse.json();
    const rawContent = llmData.choices?.[0]?.message?.content || "";

    // Parse LLM response
    let parsedResponse: CitedResponse;
    try {
      parsedResponse = JSON.parse(rawContent);
    } catch {
      // Fallback if JSON parsing fails
      parsedResponse = {
        answer: rawContent,
        citations: [],
      };
    }

    // Validate citations
    const validatedCitations = validateCitations(
      parsedResponse.citations || [],
      body.pages,
    );

    // Create or get conversation
    let conversationId = body.conversationId;

    if (!conversationId) {
      const { data: newConv, error: convError } = await supabase
        .from("conversations")
        .insert({
          paper_id: body.paperId,
          title: body.message.slice(0, 100),
        })
        .select("id")
        .single();

      if (convError) {
        console.error("Conversation creation error:", convError);
      } else {
        conversationId = newConv.id;
      }
    }

    // Save messages to database
    if (conversationId) {
      // Save user message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "user",
        content: body.message,
      });

      // Save assistant message
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: JSON.stringify(parsedResponse),
        citations: validatedCitations,
        model_used: process.env.OPENROUTER_MODEL || "openrouter",
      });
    }

    return NextResponse.json({
      conversationId,
      content: parsedResponse.answer,
      citations: validatedCitations,
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 },
    );
  }
}

/**
 * Extract answer text from stored content (which may be JSON)
 */
function extractAnswerFromContent(content: string): string {
  try {
    const parsed = JSON.parse(content);
    return parsed.answer || content;
  } catch {
    return content;
  }
}
