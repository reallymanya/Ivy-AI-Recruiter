import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";

type ResumeDownloadRouteProps = {
  params: Promise<{
    candidateId: string;
  }>;
};

export async function GET(_request: Request, { params }: ResumeDownloadRouteProps) {
  await auth.protect();

  const { candidateId } = await params;
  const candidate = await db.query.candidates.findFirst({
    where: eq(candidates.id, candidateId),
  });

  if (!candidate?.resumeFileData && !candidate?.resumeText) {
    return NextResponse.json({ error: "Resume document not found." }, { status: 404 });
  }

  if (candidate.resumeFileData) {
    const fileBuffer = Buffer.from(candidate.resumeFileData, "base64");
    const fileName = sanitizeFileName(candidate.resumeFileName || `${slugify(candidate.name)}-resume`);

    return new Response(fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": candidate.resumeFileType || "application/octet-stream",
      },
    });
  }

  const fileName = `${slugify(candidate.name)}-resume.doc`;
  const documentHtml = buildWordDocument(candidate.name, candidate.resumeText ?? "");

  return new Response(documentHtml, {
    headers: {
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/msword; charset=utf-8",
    },
  });
}

function sanitizeFileName(value: string) {
  return value.replace(/["\r\n/\\]/g, "").trim() || "resume";
}

function buildWordDocument(candidateName: string, resumeText: string) {
  const formattedResumeHtml = formatExtractedResumeHtml(resumeText);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(candidateName)} Resume</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.45; color: #111827; }
      h1 { font-size: 20pt; margin: 0 0 6px; }
      h2 { border-bottom: 1px solid #d1d5db; font-size: 12pt; letter-spacing: 0.08em; margin: 18px 0 8px; padding-bottom: 3px; text-transform: uppercase; }
      p { margin: 0 0 8px; }
      ul { margin: 4px 0 10px 18px; padding: 0; }
      li { margin: 0 0 5px; }
      .contact { color: #4b5563; margin-bottom: 14px; }
      .note { color: #6b7280; font-size: 9pt; margin-bottom: 16px; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(candidateName)} Resume</h1>
    <p class="note">Generated from extracted resume text. Re-upload this candidate's original resume to preserve exact PDF/DOC formatting.</p>
    ${formattedResumeHtml}
  </body>
</html>`;
}

function formatExtractedResumeHtml(resumeText: string) {
  const normalizedText = normalizeExtractedResumeText(resumeText);
  const sectionPattern = /\b(SKILLS|PROJECTS|CERTIFICATES|ACHIEVEMENTS|EDUCATION|EXPERIENCE|WORK EXPERIENCE)\b/g;
  const sections: Array<{ title: string; content: string }> = [];
  let currentTitle = "Profile";
  let currentStart = 0;
  let match: RegExpExecArray | null;

  while ((match = sectionPattern.exec(normalizedText)) !== null) {
    const content = normalizedText.slice(currentStart, match.index).trim();

    if (content) {
      sections.push({ title: currentTitle, content });
    }

    currentTitle = match[1];
    currentStart = match.index + match[0].length;
  }

  const finalContent = normalizedText.slice(currentStart).trim();

  if (finalContent) {
    sections.push({ title: currentTitle, content: finalContent });
  }

  return sections
    .map((section) => {
      const body =
        section.title === "Profile"
          ? `<p class="contact">${escapeHtml(section.content)}</p>`
          : formatSectionContent(section.content);

      return section.title === "Profile"
        ? body
        : `<h2>${escapeHtml(section.title)}</h2>${body}`;
    })
    .join("\n");
}

function normalizeExtractedResumeText(resumeText: string) {
  return resumeText
    .replace(/\bS\s+KILLS\b/gi, "SKILLS")
    .replace(/\bP\s+ROJECTS\b/gi, "PROJECTS")
    .replace(/\bC\s+ERTIFICATES\b/gi, "CERTIFICATES")
    .replace(/\bA\s+CHIEVEMENTS\b/gi, "ACHIEVEMENTS")
    .replace(/\bE\s+DUCATION\b/gi, "EDUCATION")
    .replace(/\s*•\s*/g, "\n• ")
    .replace(/\s+(SKILLS|PROJECTS|CERTIFICATES|ACHIEVEMENTS|EDUCATION|EXPERIENCE|WORK EXPERIENCE)\b/g, "\n$1")
    .replace(/\s+(Tech\s*:)/gi, "\n$1")
    .replace(/\s+(Implemented|Designed|Developed|Built|Created)\s+/g, "\n$1 ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatSectionContent(content: string) {
  const lines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const listItems: string[] = [];
  const paragraphs: string[] = [];

  for (const line of lines) {
    if (line.startsWith("•")) {
      listItems.push(line.replace(/^•\s*/, ""));
    } else {
      paragraphs.push(line);
    }
  }

  return [
    ...paragraphs.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`),
    listItems.length > 0
      ? `<ul>${listItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : "",
  ].join("");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "candidate"
  );
}
