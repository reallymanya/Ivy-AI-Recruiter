import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { candidates, interviewSessions, jobs } from "@/lib/db/schema";
import { getDashboardUser } from "@/lib/auth/dashboard-user";
import { getSettingsForUser } from "@/lib/interview/agent-settings";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

const interviewTypeLabels = {
  screening: "Screening Interview",
  technical: "Technical Interview",
  hr_final: "HR Final Interview",
} as const;

type InterviewType = keyof typeof interviewTypeLabels;

type InviteResult = {
  candidateId: string;
  name: string;
  email: string | null;
  interviewLink?: string;
  status: "sent" | "skipped" | "failed";
  message: string;
};

export async function POST(request: Request) {
  const recruiter = await getDashboardUser();
  const settings = await getSettingsForUser(recruiter.id);

  const payload = (await request.json()) as {
    jobId?: string;
    candidateIds?: string[];
    interviewType?: InterviewType;
    emailSubject?: string;
    emailBody?: string;
  };

  const jobId = payload.jobId?.trim();
  const candidateIds = Array.from(new Set(payload.candidateIds ?? [])).filter(Boolean);
  const interviewType = normalizeInterviewType(payload.interviewType);

  if (!jobId || candidateIds.length === 0) {
    return NextResponse.json(
      { error: "jobId and at least one candidateId are required." },
      { status: 400 },
    );
  }

  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = settings.companyName || process.env.BREVO_SENDER_NAME?.trim() || "Ivy Recruiting Team";

  if (!apiKey) {
    return NextResponse.json({ error: "BREVO_API_KEY is not configured." }, { status: 500 });
  }

  if (!senderEmail) {
    return NextResponse.json(
      { error: "BREVO_SENDER_EMAIL is not configured. Use your verified Brevo sender email." },
      { status: 500 },
    );
  }

  const [job] = await db.select().from(jobs).where(and(eq(jobs.id, jobId), eq(jobs.recruiterId, recruiter.id))).limit(1);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const candidateRows = await db
    .select()
    .from(candidates)
    .where(and(inArray(candidates.id, candidateIds), eq(candidates.recruiterId, recruiter.id)));

  const subjectTemplate =
    normalizeTemplate(payload.emailSubject) || settings.emailSubjectTemplate;
  const bodyTemplate =
    normalizeTemplate(payload.emailBody) ||
    `Hi {{candidateName}},

${settings.emailIntro}

We would like to invite you to complete a ${interviewTypeLabels[
      interviewType
    ].toLowerCase()}.

Start your interview here:
{{interviewLink}}

Best,
${settings.companyName}`;
  const results: InviteResult[] = [];
  const origin = getRequestOrigin(request);

  for (const candidate of candidateRows) {
    if (!candidate.email) {
      results.push({
        candidateId: candidate.id,
        name: candidate.name,
        email: null,
        status: "skipped",
        message: "Candidate has no email address.",
      });
      continue;
    }

    const existingSession = await db.query.interviewSessions.findFirst({
      where: (table, { and }) =>
        and(
          eq(table.jobId, job.id),
          eq(table.candidateId, candidate.id),
          eq(table.recruiterId, recruiter.id),
          eq(table.status, "scheduled"),
        ),
    });
    const session =
      existingSession ??
      (
        await db
          .insert(interviewSessions)
          .values({
            jobId: job.id,
            candidateId: candidate.id,
            recruiterId: recruiter.id,
            interviewType,
            status: "scheduled",
            scheduledAt: new Date(),
          })
          .returning({ id: interviewSessions.id })
      )[0];
    const interviewLink = `${origin}/interview/${session.id}?type=${interviewType}`;
    const values = {
      candidateName: candidate.name,
      jobTitle: job.title,
      interviewLink,
    };
    const subject = renderTemplate(subjectTemplate, values);
    const textContent = renderTemplate(bodyTemplate, values);

    try {
      await sendBrevoEmail({
        apiKey,
        senderEmail,
        senderName,
        toEmail: candidate.email,
        toName: candidate.name,
        subject,
        textContent,
        replyToEmail: settings.replyToEmail,
        logoUrl: settings.companyLogoUrl,
      });

      await db
        .update(interviewSessions)
        .set({
          interviewType,
          recruiterId: recruiter.id,
          invitedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(interviewSessions.id, session.id));

      results.push({
        candidateId: candidate.id,
        name: candidate.name,
        email: candidate.email,
        interviewLink,
        status: "sent",
        message: existingSession
          ? "Invite sent through Brevo with existing interview link."
          : "Invite sent through Brevo with new interview link.",
      });
    } catch (error) {
      results.push({
        candidateId: candidate.id,
        name: candidate.name,
        email: candidate.email,
        interviewLink,
        status: "failed",
        message: error instanceof Error ? error.message : "Invite failed.",
      });
    }
  }

  return NextResponse.json({ results });
}

async function sendBrevoEmail({
  apiKey,
  senderEmail,
  senderName,
  toEmail,
  toName,
  subject,
  textContent,
  replyToEmail,
  logoUrl,
}: {
  apiKey: string;
  senderEmail: string;
  senderName: string;
  toEmail: string;
  toName: string;
  subject: string;
  textContent: string;
  replyToEmail: string;
  logoUrl: string;
}) {
  const response = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail,
      },
      to: [{ email: toEmail, name: toName }],
      ...(replyToEmail ? { replyTo: { email: replyToEmail } } : {}),
      subject,
      textContent,
      htmlContent: renderHtmlEmail(textContent, logoUrl),
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo send failed: ${await response.text()}`);
  }
}

function renderTemplate(
  template: string,
  values: { candidateName: string; jobTitle: string; interviewLink: string },
) {
  return template
    .replaceAll("{{candidateName}}", values.candidateName)
    .replaceAll("{{jobTitle}}", values.jobTitle)
    .replaceAll("{{interviewLink}}", values.interviewLink);
}

function renderHtmlEmail(textContent: string, logoUrl: string) {
  const body = textContent
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
    .join("");
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="Company logo" style="max-height:48px;max-width:180px;margin-bottom:20px" />`
    : "";
  return `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b">${logo}${body}</div>`;
}

function normalizeTemplate(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeInterviewType(value: unknown): InterviewType {
  return value === "technical" || value === "hr_final" ? value : "screening";
}

function getRequestOrigin(request: Request) {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedHost) {
    return `${forwardedProto || "https"}://${forwardedHost}`;
  }

  return url.origin;
}
