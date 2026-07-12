import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { getDashboardUser } from "@/lib/auth/dashboard-user";
import { getSettingsForUser } from "@/lib/interview/agent-settings";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

const interviewTypeLabels = {
  screening: "screening interview",
  technical: "technical interview",
  hr_final: "HR final interview",
} as const;

type InterviewType = keyof typeof interviewTypeLabels;

export async function POST(request: Request) {
  const recruiter = await getDashboardUser();
  const settings = await getSettingsForUser(recruiter.id);

  const payload = (await request.json()) as {
    jobId?: string;
    interviewType?: InterviewType;
    candidateNames?: string[];
  };
  const jobId = payload.jobId?.trim();
  const interviewType = normalizeInterviewType(payload.interviewType);

  if (!jobId) {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }

  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.recruiterId, recruiter.id))).limit(1);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const fallback = buildFallbackEmail(settings);
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ ...fallback, source: "fallback" });
  }

  try {
    const generated = await generateEmailWithGroq({
      apiKey,
      jobTitle: job.title,
      jobDescription: job.description,
      interviewType,
      candidateNames: payload.candidateNames ?? [],
      companyName: settings.companyName,
      emailIntro: settings.emailIntro,
      fallback,
    });

    return NextResponse.json({ ...generated, source: "ai" });
  } catch (error) {
    console.error("Invite email generation failed", error);

    return NextResponse.json({ ...fallback, source: "fallback" });
  }
}

async function generateEmailWithGroq({
  apiKey,
  jobTitle,
  jobDescription,
  interviewType,
  candidateNames,
  companyName,
  emailIntro,
  fallback,
}: {
  apiKey: string;
  jobTitle: string;
  jobDescription: string | null;
  interviewType: InterviewType;
  candidateNames: string[];
  companyName: string;
  emailIntro: string;
  fallback: { subject: string; body: string };
}) {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write concise recruiting interview invitation emails. Return only valid JSON. Preserve placeholders exactly.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Draft a recruiter-editable email invitation. Keep it warm, direct, and under 140 words. Use {{candidateName}} where the candidate name should go, {{jobTitle}} where the job title should go, and {{interviewLink}} where the candidate interview link should go.",
            requiredJsonShape: {
              subject: "email subject",
              body: "plain text email body with placeholders",
            },
            jobTitle,
            interviewType: interviewTypeLabels[interviewType],
            jobDescription,
            candidateNames: candidateNames.slice(0, 8),
            companyName,
            defaultIntroduction: emailIntro,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq response did not include content.");
  }

  const parsed = JSON.parse(content) as { subject?: string; body?: string };
  return {
    subject: ensureSubjectPlaceholder(fallback.subject),
    body: ensureBodyPlaceholders(normalizeTemplate(parsed.body) || fallback.body),
  };
}

function buildFallbackEmail(settings: { emailSubjectTemplate: string; emailIntro: string; companyName: string }) {
  return {
    subject: settings.emailSubjectTemplate,
    body: `Hi {{candidateName}},

${settings.emailIntro}

Role: {{jobTitle}}

Start your interview here:
{{interviewLink}}

Best,
${settings.companyName}`,
  };
}

function ensureSubjectPlaceholder(value: string) {
  return value.includes("{{jobTitle}}") ? value : `${value} - {{jobTitle}}`;
}

function ensureBodyPlaceholders(value: string) {
  const withName = value.includes("{{candidateName}}")
    ? value
    : `Hi {{candidateName}},\n\n${value}`;

  const withJobTitle = withName.includes("{{jobTitle}}")
    ? withName
    : withName.replace("the role", "the {{jobTitle}} role");

  return withJobTitle.includes("{{interviewLink}}")
    ? withJobTitle
    : `${withJobTitle}\n\nInterview link: {{interviewLink}}`;
}

function normalizeTemplate(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeInterviewType(value: unknown): InterviewType {
  return value === "technical" || value === "hr_final" ? value : "screening";
}
