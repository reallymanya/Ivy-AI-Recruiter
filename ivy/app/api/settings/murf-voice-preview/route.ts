import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const MURF_STREAM_URL = "https://global.api.murf.ai/v1/speech/stream";

export async function POST(request: Request) {
  await auth.protect();
  const apiKey = process.env.MURF_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ error: "MURF_API_KEY is not configured." }, { status: 500 });

  const payload = (await request.json()) as { voiceId?: string; locale?: string; style?: string };
  if (!payload.voiceId || !payload.locale || !payload.style) {
    return NextResponse.json({ error: "Voice, locale, and style are required." }, { status: 400 });
  }

  const response = await fetch(MURF_STREAM_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      voiceId: payload.voiceId,
      locale: payload.locale,
      style: payload.style,
      text: "Hello, I am your AI interviewer. I look forward to learning more about your experience today.",
      model: "falcon-2",
      format: "MP3",
      sampleRate: 24000,
      channelType: "MONO",
    }),
  });

  if (!response.ok || !response.body) {
    return NextResponse.json(
      { error: `Murf preview failed: ${await response.text()}` },
      { status: response.status || 502 },
    );
  }

  return new Response(response.body, {
    headers: { "Content-Type": response.headers.get("Content-Type") ?? "audio/mpeg", "Cache-Control": "no-store" },
  });
}
