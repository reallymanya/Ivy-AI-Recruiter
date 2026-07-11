import { NextResponse } from "next/server";

import { getSettingsForInterview } from "@/lib/interview/agent-settings";

const MURF_STREAM_URL = "https://global.api.murf.ai/v1/speech/stream";

export async function POST(request: Request) {
  const apiKey = process.env.MURF_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing MURF_API_KEY" }, { status: 500 });
  }

  const body = (await request.json()) as { text?: string; interviewId?: string };
  const text = body.text?.trim();

  if (!text) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }
  const settings = body.interviewId
    ? await getSettingsForInterview(body.interviewId)
    : null;

  const murfResponse = await fetch(MURF_STREAM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      voiceId: settings?.voiceId ?? "Abhinav",
      style: settings?.voiceStyle ?? "Conversational",
      text,
      locale: settings?.voiceLocale ?? "en-IN",
      model: "falcon-2",
      format: "MP3",
      sampleRate: 24000,
      channelType: "MONO",
    }),
  });

  if (!murfResponse.ok || !murfResponse.body) {
    const errorText = await murfResponse.text();

    return NextResponse.json(
      { error: "Murf speech stream failed", details: errorText },
      { status: murfResponse.status || 502 },
    );
  }

  return new Response(murfResponse.body, {
    status: 200,
    headers: {
      "Content-Type": murfResponse.headers.get("Content-Type") ?? "audio/mpeg",
      "Cache-Control": "no-store",
    },
  });
}
