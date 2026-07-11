import { NextResponse } from "next/server";

const GROQ_TRANSCRIPTIONS_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  const incomingFormData = await request.formData();
  const audio = incomingFormData.get("audio");

  if (!(audio instanceof Blob) || audio.size === 0) {
    return NextResponse.json({ error: "Audio file is required" }, { status: 400 });
  }

  const formData = new FormData();
  formData.append("file", audio, "candidate-answer.webm");
  formData.append("model", "whisper-large-v3-turbo");
  formData.append("response_format", "json");
  formData.append("temperature", "0");

  const response = await fetch(GROQ_TRANSCRIPTIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const details = await response.text();

    return NextResponse.json(
      { error: "Groq transcription failed", details },
      { status: response.status || 502 },
    );
  }

  const data = (await response.json()) as { text?: string };

  return NextResponse.json({ text: data.text?.trim() ?? "" });
}
