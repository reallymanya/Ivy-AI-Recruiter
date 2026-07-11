import { NextResponse } from "next/server";

import { getSettingsForInterview } from "@/lib/interview/agent-settings";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

type TranscriptMessage = {
  speaker: "agent" | "candidate" | "system";
  text: string;
};

type NextQuestionRequest = {
  candidateName?: string;
  role?: string;
  company?: string;
  jobDescription?: string;
  turnNumber?: number;
  maxTurns?: number;
  transcript?: TranscriptMessage[];
  interviewId?: string;
};

type NextQuestionResponse = {
  shouldContinue: boolean;
  message: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Missing GROQ_API_KEY" }, { status: 500 });
  }

  const payload = (await request.json()) as NextQuestionRequest;
  const transcript = (payload.transcript ?? []).filter((message) => message.text?.trim());
  const turnNumber = payload.turnNumber ?? 1;
  const maxTurns = payload.maxTurns ?? 8;
  const settings = payload.interviewId
    ? await getSettingsForInterview(payload.interviewId)
    : null;

  if (!payload.candidateName || !payload.role || transcript.length === 0) {
    return NextResponse.json(
      { error: "candidateName, role, and transcript are required" },
      { status: 400 },
    );
  }

  const result = await generateNextQuestion({
    apiKey,
    candidateName: payload.candidateName,
    role: payload.role,
    company: payload.company ?? "Ivy Recruiter",
    jobDescription: payload.jobDescription ?? "Not provided",
    turnNumber,
    maxTurns,
    transcript,
    agentName: settings?.agentName ?? "Ivy",
    allowFollowUps: settings?.allowFollowUps ?? true,
    customPrompt: settings?.interviewPrompt ?? "",
    closingMessage: settings?.closingMessage ?? "Thank you for your time. Your interview is now complete.",
  });

  return NextResponse.json(result);
}

async function generateNextQuestion({
  apiKey,
  candidateName,
  role,
  company,
  jobDescription,
  turnNumber,
  maxTurns,
  transcript,
  agentName,
  allowFollowUps,
  customPrompt,
  closingMessage,
}: {
  apiKey: string;
  candidateName: string;
  role: string;
  company: string;
  jobDescription: string;
  turnNumber: number;
  maxTurns: number;
  transcript: TranscriptMessage[];
  agentName: string;
  allowFollowUps: boolean;
  customPrompt: string;
  closingMessage: string;
}): Promise<NextQuestionResponse> {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.45,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            `You are ${agentName}, an AI recruiter conducting a concise voice interview. Ask one conversational question at a time. Be warm, professional, and specific. ${allowFollowUps ? "Adapt to previous answers and ask targeted follow-ups when useful." : "Do not ask follow-up questions; move to the next role-relevant topic."} Return only valid JSON.`,
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Decide Ivy's next spoken response. If the candidate's last answer is shallow, ask a targeted follow-up. If enough has been covered for this turn, ask the next role-relevant question. End only after the max turn count or if the transcript has enough evidence across experience, role fit, collaboration, problem solving, strengths, risks, and motivation.",
            requiredJsonShape: {
              shouldContinue: "boolean",
              message:
                "Ivy's next spoken sentence/question. If shouldContinue is false, thank the candidate and say the interview is complete.",
            },
            candidateName,
            role,
            company,
            jobDescription,
            turnNumber,
            maxTurns,
            recruiterInstructions: customPrompt || "No additional recruiter instructions.",
            transcript,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq next question failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq response did not include content.");
  }

  const parsed = JSON.parse(content) as Partial<NextQuestionResponse>;
  const shouldContinue = turnNumber < maxTurns && parsed.shouldContinue !== false;

  return {
    shouldContinue,
    message:
      (!shouldContinue ? closingMessage : "") ||
      parsed.message?.trim() ||
      "Thank you. Could you share one specific example that best shows your fit for this role?",
  };
}
