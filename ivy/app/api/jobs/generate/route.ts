import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";

type GeneratedJob = {
  title: string;
  department: string;
  employmentType: string;
  level: string;
  location: string;
  minSalary: string;
  maxSalary: string;
  currency: string;
  description: string;
  responsibilities: string;
  requirements: string;
  rubric: string;
};

export async function POST(request: Request) {
  await auth.protect();

  const payload = (await request.json()) as { title?: string };
  const title = payload.title?.trim();

  if (!title) {
    return NextResponse.json({ error: "Job title is required." }, { status: 400 });
  }

  const fallback = buildFallbackJob(title);
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ job: fallback, source: "fallback" });
  }

  try {
    const job = await generateJobWithGroq({ apiKey, title });

    return NextResponse.json({
      job: {
        ...fallback,
        ...job,
        title,
      },
      source: "ai",
    });
  } catch (error) {
    console.error("Job generation failed", error);

    return NextResponse.json({ job: fallback, source: "fallback" });
  }
}

async function generateJobWithGroq({
  apiKey,
  title,
}: {
  apiKey: string;
  title: string;
}): Promise<Partial<GeneratedJob>> {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You help recruiters draft concise job postings. Return only valid JSON.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task:
              "Generate a practical job posting draft from only the title. Keep it concise and editable.",
            requiredJsonShape: {
              title: "same job title",
              department: "likely department",
              employmentType: "Full-time, Part-time, Contract, or Internship",
              level: "Junior, Mid, Senior, Lead, or Principal",
              location: "Remote, Hybrid, or a generic location",
              minSalary: "minimum salary as a number string",
              maxSalary: "maximum salary as a number string",
              currency: "3-letter currency such as USD",
              description: "recruiter-facing job description in 2-4 short paragraphs",
              responsibilities: "newline-separated key responsibilities",
              requirements: "newline-separated key requirements",
              rubric:
                "newline-separated screening criteria such as skills, experience, communication, ownership",
            },
            title,
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

  return normalizeGeneratedJob(JSON.parse(content) as Partial<GeneratedJob>);
}

function buildFallbackJob(title: string): GeneratedJob {
  return {
    title,
    department: inferDepartment(title),
    employmentType: "Full-time",
    level: inferLevel(title),
    location: "Remote",
    minSalary: "80000",
    maxSalary: "120000",
    currency: "USD",
    description: `${title} role responsible for delivering high-quality work, collaborating with cross-functional partners, and communicating progress clearly. Recruiter should tailor responsibilities and requirements to the hiring team's exact needs.`,
    responsibilities: [
      "Own role-relevant projects from planning through delivery",
      "Collaborate with cross-functional partners and communicate progress clearly",
      "Contribute to reliable, maintainable, and high-quality work",
    ].join("\n"),
    requirements: [
      "Relevant professional experience for the role",
      "Strong problem-solving and communication skills",
      "Ability to work independently and in a collaborative team",
    ].join("\n"),
    rubric: [
      "Relevant experience for the role",
      "Core technical or functional skills",
      "Problem solving and ownership",
      "Communication and collaboration",
      "Motivation for the opportunity",
    ].join("\n"),
  };
}

function inferLevel(title: string) {
  const lowerTitle = title.toLowerCase();

  if (/principal|staff/.test(lowerTitle)) {
    return "Principal";
  }

  if (/lead|head/.test(lowerTitle)) {
    return "Lead";
  }

  if (/senior|sr\./.test(lowerTitle)) {
    return "Senior";
  }

  if (/junior|entry|intern/.test(lowerTitle)) {
    return "Junior";
  }

  return "Mid";
}

function inferDepartment(title: string) {
  const lowerTitle = title.toLowerCase();

  if (/engineer|developer|frontend|backend|full stack|data|ai|ml/.test(lowerTitle)) {
    return "Engineering";
  }

  if (/designer|product design|ux|ui/.test(lowerTitle)) {
    return "Design";
  }

  if (/sales|account|business development/.test(lowerTitle)) {
    return "Sales";
  }

  if (/marketing|growth|content/.test(lowerTitle)) {
    return "Marketing";
  }

  if (/recruit|talent|people|hr/.test(lowerTitle)) {
    return "People";
  }

  return "General";
}

function normalizeGeneratedJob(job: Partial<GeneratedJob>): Partial<GeneratedJob> {
  return {
    title: normalizeString(job.title),
    department: normalizeString(job.department),
    employmentType: normalizeString(job.employmentType),
    level: normalizeString(job.level),
    location: normalizeString(job.location),
    minSalary: normalizeString(job.minSalary),
    maxSalary: normalizeString(job.maxSalary),
    currency: normalizeString(job.currency),
    description: normalizeString(job.description),
    responsibilities: normalizeString(job.responsibilities),
    requirements: normalizeString(job.requirements),
    rubric: normalizeString(job.rubric),
  };
}

function normalizeString(value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
      .join("\n");
  }

  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}
