import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const MURF_VOICES_URL = "https://api.murf.ai/v1/speech/voices?model=falcon-2";

type MurfVoice = {
  voiceId?: string;
  displayName?: string;
  gender?: string;
  description?: string;
  locale?: string;
  supportedLocales?: Record<string, { availableStyles?: string[]; detail?: string }>;
};

export async function GET() {
  await auth.protect();
  const apiKey = process.env.MURF_API_KEY?.trim();

  if (!apiKey) {
    return NextResponse.json({ error: "MURF_API_KEY is not configured." }, { status: 500 });
  }

  const response = await fetch(MURF_VOICES_URL, {
    headers: { "api-key": apiKey },
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: `Murf voices request failed: ${await response.text()}` },
      { status: response.status },
    );
  }

  const voices = ((await response.json()) as MurfVoice[])
    .filter((voice) => voice.voiceId)
    .map((voice) => ({
      id: voice.voiceId as string,
      name: voice.displayName || voice.voiceId as string,
      gender: voice.gender || "",
      description: voice.description || "",
      locales: Object.entries(voice.supportedLocales ?? {}).map(([id, locale]) => ({
        id,
        name: locale.detail || id,
        styles: locale.availableStyles?.length ? locale.availableStyles : ["Conversational"],
      })),
    }))
    .filter((voice) =>
      voice.locales.some(
        (locale) =>
          locale.id.startsWith("en-") &&
          locale.styles.some((style) => style === "Conversational" || style === "Calm"),
      ),
    )
    .sort((first, second) => interviewVoiceScore(second) - interviewVoiceScore(first) || first.name.localeCompare(second.name))
    .slice(0, 16);

  return NextResponse.json({ voices });
}

function interviewVoiceScore(voice: { locales: Array<{ id: string; styles: string[] }> }) {
  return voice.locales.reduce((score, locale) => {
    if (!locale.id.startsWith("en-")) return score;
    return Math.max(
      score,
      (locale.id === "en-IN" ? 4 : 1) +
        (locale.styles.includes("Conversational") ? 3 : 0) +
        (locale.styles.includes("Calm") ? 1 : 0),
    );
  }, 0);
}
