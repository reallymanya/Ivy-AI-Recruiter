import { auth } from "@clerk/nextjs/server";
import mammoth from "mammoth";
import { NextResponse } from "next/server";
import "pdf-parse/worker";
import { PDFParse } from "pdf-parse";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const MAX_RESUME_CHARS = 20_000;
const MAX_AI_RESUME_CHARS = 7_000;

type ParsedCandidate = {
  name: string;
  email: string;
  phone: string;
  location: string;
  currentTitle: string;
  currentCompany: string;
  linkedinUrl: string;
  portfolioUrl: string;
  experienceYears: string;
  skills: string;
  strengths: string;
  weaknesses: string;
  source: string;
  notes: string;
  resumeText: string;
  resumeFileName: string;
  resumeFileType: string;
  resumeFileData: string;
};

export async function POST(request: Request) {
  let fileName = "unknown";
  let fileType = "unknown";
  let stage = "auth";

  try {
    await auth.protect();

    stage = "form-data";
    const formData = await request.formData();
    const resume = formData.get("resume");

    if (!(resume instanceof File)) {
      return NextResponse.json({ error: "Resume file is required." }, { status: 400 });
    }

    fileName = resume.name;
    fileType = resume.type || "unknown";

    stage = "read-file";
    const fileBuffer = Buffer.from(await resume.arrayBuffer());

    stage = "extract-text";
    const rawResumeText = await extractResumeText(resume, fileBuffer);
    const resumeText = normalizeResumeText(rawResumeText);

    if (!resumeText) {
      return NextResponse.json(
        {
          error: isPdfFile(resume)
            ? "This PDF does not contain readable text. Try a text-based PDF or fill manually."
            : "This resume could not be read. Try a text-based PDF, DOCX, or fill manually.",
        },
        { status: 400 },
      );
    }

    const fallbackCandidate = parseResumeFallback(resumeText, resume.name);
    const resumeFile = {
      resumeFileName: resume.name,
      resumeFileType: resume.type || getFallbackMimeType(resume.name),
      resumeFileData: fileBuffer.toString("base64"),
    };
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return NextResponse.json({
        candidate: {
          ...fallbackCandidate,
          ...resumeFile,
        },
        source: "fallback",
      });
    }

    stage = "ai-parse";

    try {
      const candidate = await parseResumeWithGroq({
        apiKey,
        fileName: resume.name,
        resumeText: trimForAi(resumeText),
      });

      return NextResponse.json({
        candidate: {
          ...fallbackCandidate,
          ...candidate,
          resumeText,
          source: candidate.source || resume.name,
          ...resumeFile,
        },
        source: "ai",
      });
    } catch (error) {
      logResumeParseError(error, { fileName, fileType, stage });

      return NextResponse.json({
        candidate: {
          ...fallbackCandidate,
          ...resumeFile,
        },
        source: "fallback",
      });
    }
  } catch (error) {
    logResumeParseError(error, { fileName, fileType, stage });

    return NextResponse.json({
      error: getUserFacingParseError(error, stage),
    }, { status: stage === "auth" ? 401 : 400 });
  }
}

async function extractResumeText(file: File, buffer: Buffer) {
  if (isPdfFile(file)) {
    return extractPdfText(buffer);
  }

  if (isWordFile(file)) {
    const result = await mammoth.extractRawText({ buffer });

    return result.value;
  }

  return file.text();
}

async function extractPdfText(buffer: Buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });

  try {
    const result = await parser.getText();

    return result.text;
  } finally {
    await parser.destroy();
  }
}

async function parseResumeWithGroq({
  apiKey,
  fileName,
  resumeText,
}: {
  apiKey: string;
  fileName: string;
  resumeText: string;
}): Promise<Partial<ParsedCandidate>> {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You extract structured candidate details from resumes for recruiters. Return only valid JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Extract candidate details. Use empty strings for missing fields. Keep comma-separated fields compact and recruiter friendly.",
            requiredJsonShape: {
              name: "candidate full name",
              email: "candidate email",
              phone: "candidate phone",
              location: "current location",
              currentTitle: "current or most recent title",
              currentCompany: "current or most recent company",
              linkedinUrl: "LinkedIn URL",
              portfolioUrl: "portfolio, GitHub, personal site, or other primary URL",
              experienceYears: "number of years as a string",
              skills: "comma separated key skills",
              strengths: "comma separated likely strengths",
              weaknesses: "comma separated gaps or risks, empty if none evident",
              source: "resume file name or origin",
              notes: "short AI summary for a recruiter",
            },
            fileName,
            resumeText,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq resume parse failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Groq response did not include content.");
  }

  return normalizeCandidate(JSON.parse(content) as Partial<ParsedCandidate>);
}

function parseResumeFallback(resumeText: string, fileName: string): ParsedCandidate {
  const lines = resumeText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const email = resumeText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? "";
  const phone = resumeText.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim() ?? "";
  const linkedinUrl = resumeText.match(/https?:\/\/(?:www\.)?linkedin\.com\/[^\s)]+/i)?.[0] ?? "";
  const portfolioUrl = findPortfolioUrl(resumeText, linkedinUrl);

  return {
    name: findLikelyName(lines, email),
    email,
    phone,
    location: "",
    currentTitle: "",
    currentCompany: "",
    linkedinUrl,
    portfolioUrl,
    experienceYears: "",
    skills: inferSkills(resumeText),
    strengths: "",
    weaknesses: "",
    source: fileName,
    notes: summarizeResume(lines),
    resumeText,
    resumeFileName: fileName,
    resumeFileType: getFallbackMimeType(fileName),
    resumeFileData: "",
  };
}

function getFallbackMimeType(fileName: string) {
  const lowerFileName = fileName.toLowerCase();

  if (lowerFileName.endsWith(".pdf")) {
    return "application/pdf";
  }

  if (lowerFileName.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  if (lowerFileName.endsWith(".doc")) {
    return "application/msword";
  }

  return "application/octet-stream";
}

function normalizeResumeText(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_RESUME_CHARS);
}

function trimForAi(resumeText: string) {
  return resumeText.slice(0, MAX_AI_RESUME_CHARS);
}

function isPdfFile(file: File) {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return fileName.endsWith(".pdf") || fileType.includes("pdf");
}

function isWordFile(file: File) {
  const fileName = file.name.toLowerCase();
  const fileType = file.type.toLowerCase();

  return (
    fileName.endsWith(".docx") ||
    fileName.endsWith(".doc") ||
    fileType.includes("wordprocessingml") ||
    fileType.includes("msword")
  );
}

function findLikelyName(lines: string[], email: string) {
  const emailUser = email.split("@")[0]?.toLowerCase();

  return (
    lines.find((line) => {
      const words = line.split(/\s+/);
      const hasEmailUser = emailUser && line.toLowerCase().includes(emailUser);

      return words.length >= 2 && words.length <= 4 && !hasEmailUser && !/[/:@|]/.test(line);
    }) ?? ""
  );
}

function findPortfolioUrl(resumeText: string, linkedinUrl: string) {
  const urls = resumeText.match(/https?:\/\/[^\s)]+/gi) ?? [];

  return urls.find((url) => url !== linkedinUrl && !url.includes("linkedin.com")) ?? "";
}

function inferSkills(resumeText: string) {
  const skillOptions = [
    "React",
    "Next.js",
    "TypeScript",
    "JavaScript",
    "Node.js",
    "Python",
    "SQL",
    "Postgres",
    "AWS",
    "Docker",
    "Figma",
    "Product Design",
    "Analytics",
    "Machine Learning",
    "Java",
    "Swift",
    "Android",
  ];
  const normalizedResume = resumeText.toLowerCase();

  return skillOptions
    .filter((skill) => normalizedResume.includes(skill.toLowerCase()))
    .slice(0, 10)
    .join(", ");
}

function summarizeResume(lines: string[]) {
  const usefulLines = lines
    .filter((line) => line.length > 12 && !/^[\d\s().+-]+$/.test(line))
    .slice(0, 8);

  return usefulLines.join("\n").slice(0, 1200);
}

function normalizeCandidate(candidate: Partial<ParsedCandidate>): Partial<ParsedCandidate> {
  return {
    name: normalizeString(candidate.name),
    email: normalizeString(candidate.email),
    phone: normalizeString(candidate.phone),
    location: normalizeString(candidate.location),
    currentTitle: normalizeString(candidate.currentTitle),
    currentCompany: normalizeString(candidate.currentCompany),
    linkedinUrl: normalizeString(candidate.linkedinUrl),
    portfolioUrl: normalizeString(candidate.portfolioUrl),
    experienceYears: normalizeString(candidate.experienceYears),
    skills: normalizeString(candidate.skills),
    strengths: normalizeString(candidate.strengths),
    weaknesses: normalizeString(candidate.weaknesses),
    source: normalizeString(candidate.source),
    notes: normalizeString(candidate.notes),
  };
}

function normalizeString(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join(", ");
  }

  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function logResumeParseError(
  error: unknown,
  context: { fileName: string; fileType: string; stage: string },
) {
  const errorName = error instanceof Error ? error.name : "UnknownError";
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(
    `Resume parse failed at ${context.stage} for ${context.fileName} (${context.fileType}): ${errorName}: ${errorMessage}`,
  );

  if (errorStack) {
    console.error(errorStack);
  }
}

function getUserFacingParseError(error: unknown, stage: string) {
  if (stage === "auth") {
    return "Please sign in again before uploading a resume.";
  }

  const message = error instanceof Error ? error.message : String(error);

  if (/pdf|invalid|password|object\.defineproperty/i.test(message)) {
    return "This PDF could not be read. Try a text-based PDF or fill manually.";
  }

  return "Resume upload failed. Try another file or fill manually.";
}
