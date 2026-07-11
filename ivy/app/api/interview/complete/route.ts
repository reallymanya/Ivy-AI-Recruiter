import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getSettingsForInterview } from "@/lib/interview/agent-settings";
import {
  interviewMessages,
  interviewSessions,
  recommendation,
  screeningReports,
  transcriptSpeaker,
  type RubricScores,
} from "@/lib/db/schema";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

type TranscriptMessage = {
  speaker: "agent" | "candidate" | "system";
  text: string;
};

type PersistableSpeaker = "ivy" | "candidate" | "recruiter" | "system";

type CompletionRequest = {
  interviewId?: string;
  candidateName?: string;
  role?: string;
  company?: string;
  jobDescription?: string;
  transcript?: TranscriptMessage[];
};

type GroqEvaluation = {
  summary: string;
  recommendation: "strong_yes" | "yes" | "maybe" | "no" | "strong_no";
  overallScore: number;
  strengths: string[];
  risks: string[];
  rubricScores: RubricScores;
  nextSteps: string;
};

const allowedRecommendations = recommendation.enumValues;
const allowedSpeakers = transcriptSpeaker.enumValues;

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  const payload = (await request.json()) as CompletionRequest;
  const transcript = sanitizeTranscript(payload.transcript ?? []);

  if (!payload.interviewId || !payload.candidateName || transcript.length === 0) {
    return NextResponse.json(
      { error: "interviewId, candidateName, and transcript are required" },
      { status: 400 },
    );
  }
  const settings = await getSettingsForInterview(payload.interviewId);

  const evaluation = await evaluateWithGroq({
    apiKey,
    candidateName: payload.candidateName,
    role: payload.role ?? "Open role",
    company: payload.company ?? "Ivy Recruiter",
    jobDescription: payload.jobDescription ?? "Not provided",
    transcript,
    evaluationPrompt: settings.evaluationPrompt,
  });

  const persistence = await persistIfRealInterviewSession({
    interviewId: payload.interviewId,
    transcript,
    evaluation,
  });

  if (persistence.saved && settings.recruiterNotifications && settings.notificationEmail) {
    try {
      await sendCompletionNotification({
        toEmail: settings.notificationEmail,
        candidateName: payload.candidateName,
        role: payload.role ?? "Open role",
        interviewId: payload.interviewId,
        score: evaluation.overallScore,
        recommendation: evaluation.recommendation,
        lowScore: settings.lowScoreAlerts && evaluation.overallScore < settings.lowScoreThreshold,
        companyName: settings.companyName,
      });
    } catch (error) {
      console.error("Recruiter completion notification failed", error);
    }
  }

  return NextResponse.json({
    evaluation,
    persistence,
  });
}

async function sendCompletionNotification({
  toEmail,
  candidateName,
  role,
  interviewId,
  score,
  recommendation,
  lowScore,
  companyName,
}: {
  toEmail: string;
  candidateName: string;
  role: string;
  interviewId: string;
  score: number;
  recommendation: string;
  lowScore: boolean;
  companyName: string;
}) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  if (!apiKey || !senderEmail) return;
  const analysisUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"}/dashboard/interviews/${interviewId}`;
  const subject = `${lowScore ? "Low score alert: " : "Interview completed: "}${candidateName} - ${role}`;
  const content = `${candidateName} completed the ${role} interview.\n\nScore: ${score}%\nRecommendation: ${recommendation.replaceAll("_", " ")}\n${lowScore ? "\nThis score is below your configured threshold.\n" : ""}\nView AI analysis: ${analysisUrl}`;
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: companyName, email: senderEmail },
      to: [{ email: toEmail }],
      subject,
      textContent: content,
      htmlContent: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>${candidateName} completed the <strong>${role}</strong> interview.</p><p><strong>Score: ${score}%</strong><br/>Recommendation: ${recommendation.replaceAll("_", " ")}</p>${lowScore ? "<p style=\"color:#b91c1c\"><strong>Low score alert:</strong> Below your configured threshold.</p>" : ""}<p><a href="${analysisUrl}">View AI analysis</a></p></div>`,
    }),
  });
  if (!response.ok) throw new Error(await response.text());
}

async function evaluateWithGroq({
  apiKey,
  candidateName,
  role,
  company,
  jobDescription,
  transcript,
  evaluationPrompt,
}: {
  apiKey: string;
  candidateName: string;
  role: string;
  company: string;
  jobDescription: string;
  transcript: TranscriptMessage[];
  evaluationPrompt: string;
}) {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert recruiting interviewer. Evaluate candidate interview transcripts objectively. Return only valid JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Create a recruiter-facing screening report. Decide if the candidate appears capable for the role based only on the transcript evidence.",
            requiredJsonShape: {
              summary: "3-5 sentence evidence-based summary",
              recommendation: "one of strong_yes, yes, maybe, no, strong_no",
              overallScore: "integer 0-100",
              strengths: ["short evidence-backed strength"],
              risks: ["short concern or missing evidence"],
              rubricScores: [
                {
                  criterion: "criterion name",
                  score: "integer 0-100",
                  evidence: "specific transcript evidence",
                },
              ],
              nextSteps: "recommended recruiter action",
            },
            candidateName,
            role,
            company,
            jobDescription,
            recruiterEvaluationInstructions:
              evaluationPrompt || "Use the standard evidence-based evaluation.",
            transcript,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq evaluation failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq response did not include content.");
  }

  return normalizeEvaluation(JSON.parse(content) as Partial<GroqEvaluation>);
}

async function persistIfRealInterviewSession({
  interviewId,
  transcript,
  evaluation,
}: {
  interviewId: string;
  transcript: TranscriptMessage[];
  evaluation: GroqEvaluation;
}) {
  if (!isUuid(interviewId)) {
    return {
      saved: false,
      reason: "Interview ID is not a database session UUID. Evaluation returned but not persisted.",
    };
  }

  const [session] = await db
    .select({ id: interviewSessions.id })
    .from(interviewSessions)
    .where(eq(interviewSessions.id, interviewId))
    .limit(1);

  if (!session) {
    return {
      saved: false,
      reason: "No interview session found for this UUID. Evaluation returned but not persisted.",
    };
  }

  await db
    .insert(interviewMessages)
    .values(
      transcript.map((message, index) => ({
        sessionId: interviewId,
        speaker: mapSpeakerForDatabase(message.speaker),
        content: message.text,
        sequence: index + 1,
      })),
    );

  await db.insert(screeningReports).values({
    sessionId: interviewId,
    summary: evaluation.summary,
    strengths: evaluation.strengths,
    risks: evaluation.risks,
    rubricScores: evaluation.rubricScores,
    nextSteps: evaluation.nextSteps,
  });

  await db
    .update(interviewSessions)
    .set({
      status: "completed",
      completedAt: new Date(),
      overallScore: evaluation.overallScore,
      recommendation: evaluation.recommendation,
      updatedAt: new Date(),
    })
    .where(eq(interviewSessions.id, interviewId));

  return { saved: true };
}

function sanitizeTranscript(transcript: TranscriptMessage[]) {
  return transcript
    .filter((message) => message.text?.trim())
    .map((message) => ({
      speaker: normalizeTranscriptSpeaker(message.speaker),
      text: message.text.trim(),
    }));
}

function normalizeTranscriptSpeaker(speaker: TranscriptMessage["speaker"]) {
  return speaker === "agent" || allowedSpeakers.includes(speaker) ? speaker : "system";
}

function mapSpeakerForDatabase(speaker: TranscriptMessage["speaker"]): PersistableSpeaker {
  if (speaker === "agent") {
    return "ivy";
  }

  return allowedSpeakers.includes(speaker) ? speaker : "system";
}

function normalizeEvaluation(evaluation: Partial<GroqEvaluation>): GroqEvaluation {
  const recommendationValue: GroqEvaluation["recommendation"] =
    evaluation.recommendation && allowedRecommendations.includes(evaluation.recommendation)
      ? evaluation.recommendation
      : "maybe";

  return {
    summary: evaluation.summary?.trim() || "The transcript did not include enough evidence.",
    recommendation: recommendationValue,
    overallScore: clampScore(evaluation.overallScore),
    strengths: normalizeStringArray(evaluation.strengths),
    risks: normalizeStringArray(evaluation.risks),
    rubricScores: normalizeRubricScores(evaluation.rubricScores),
    nextSteps:
      evaluation.nextSteps?.trim() ||
      "Recruiter should review the transcript and decide whether to continue.",
  };
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, 6);
}

function normalizeRubricScores(value: unknown): RubricScores {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.slice(0, 8).map((item) => ({
    criterion:
      typeof item?.criterion === "string" && item.criterion.trim()
        ? item.criterion.trim()
        : "General fit",
    score: clampScore(item?.score),
    evidence:
      typeof item?.evidence === "string" && item.evidence.trim()
        ? item.evidence.trim()
        : undefined,
  }));
}

function clampScore(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(value);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(numberValue)));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
