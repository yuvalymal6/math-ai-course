import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are a Socratic Math Tutor. Never give the full answer. Only provide hints and guide the student based on their prompts.

Your core principles:
- Ask guiding questions instead of stating answers
- Break problems into small steps, revealing one at a time
- When a student is stuck, give a hint — not the solution
- Praise correct reasoning, gently redirect errors with questions
- Respond in Hebrew (עברית) since this is a Hebrew math course
- Keep responses concise and focused on one step at a time

If the student shares a photo of their work, analyze it and ask questions about specific steps.
If they ask for the answer directly, respond with a guiding question instead.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, topic } = await req.json() as {
      messages: { role: "user" | "assistant"; content: string }[];
      topic: string;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    const topicContext = topic
      ? `\n\nThe student is currently studying: ${topic}`
      : "";

    const stream = client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 512,
      system: SYSTEM_PROMPT + topicContext,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      },
      cancel() {
        stream.abort();
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
