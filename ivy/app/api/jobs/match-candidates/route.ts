import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { candidates, jobs } from "@/lib/db/schema";

const GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions";
const MIN_MATCH_SCORE = 70;

type CandidateRow = typeof candidates.$inferSelect;
type JobRow = typeof jobs.$inferSelect;

type CandidateMatch = {
  candidateId: string;
  name: string;
  email: string | null;
  score: number;
  reasons: string[];
  gaps: string[];
  nextStep: string;
};

export async function POST(request: Request) {
  await auth.protect();

  const payload = (await request.json()) as { jobId?: string };

  if (!payload.jobId) {
    return NextResponse.json({ error: "jobId is required." }, { status: 400 });
  }

  const [job] = await db.select().from(jobs).where(eq(jobs.id, payload.jobId)).limit(1);

  if (!job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 });
  }

  const candidateRows = await db.select().from(candidates);

  if (candidateRows.length === 0) {
    return NextResponse.json({ matches: [], source: "fallback" });
  }

  const fallbackMatches = rankCandidatesHeuristically(job, candidateRows);
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ matches: fallbackMatches, source: "fallback" });
  }

  try {
    const matches = await matchCandidatesWithGroq({
      apiKey,
      job,
      candidateRows,
      fallbackMatches,
    });

    if (matches.length === 0 && fallbackMatches.length > 0) {
      return NextResponse.json({ matches: fallbackMatches, source: "fallback" });
    }

    return NextResponse.json({ matches, source: "ai" });
  } catch (error) {
    console.error("Candidate matching failed", error);

    return NextResponse.json({ matches: fallbackMatches, source: "fallback" });
  }
}

async function matchCandidatesWithGroq({
  apiKey,
  job,
  candidateRows,
  fallbackMatches,
}: {
  apiKey: string;
  job: JobRow;
  candidateRows: CandidateRow[];
  fallbackMatches: CandidateMatch[];
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
            "You rank recruiting candidates for a job. Return only valid JSON with evidence-based concise output.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Rank the best matching candidates for this job.",
            requiredJsonShape: {
              matches: [
                {
                  candidateId: "candidate id",
                  name: "candidate name",
                  score: "integer 0-100",
                  reasons: ["short match reason"],
                  gaps: ["short missing evidence or risk"],
                  nextStep: "recommended recruiter action",
                },
              ],
            },
            job: serializeJob(job),
            candidates: candidateRows.map(serializeCandidate),
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

  const parsed = JSON.parse(content) as { matches?: CandidateMatch[] };
  const candidateIds = new Set(candidateRows.map((candidate) => candidate.id));
  const candidateById = new Map(candidateRows.map((candidate) => [candidate.id, candidate]));
  const fallbackByCandidateId = new Map(
    fallbackMatches.map((match) => [match.candidateId, match]),
  );

  return (parsed.matches ?? [])
    .filter((match) => candidateIds.has(match.candidateId))
    .map((match) => ({
      candidateId: match.candidateId,
      name: normalizeString(match.name) || fallbackByCandidateId.get(match.candidateId)?.name || "Candidate",
      email:
        fallbackByCandidateId.get(match.candidateId)?.email ??
        candidateById.get(match.candidateId)?.email ??
        null,
      score: clampScore(match.score),
      reasons: normalizeStringList(match.reasons).slice(0, 3),
      gaps: normalizeStringList(match.gaps).slice(0, 3),
      nextStep:
        normalizeString(match.nextStep) ||
        "Review profile and decide whether to screen.",
    }))
    .filter((match) => match.score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function rankCandidatesHeuristically(job: JobRow, candidateRows: CandidateRow[]): CandidateMatch[] {
  const jobText = [
    job.title,
    job.department,
    job.location,
    job.employmentType,
    job.level,
    job.description,
    job.responsibilities,
    job.requirements,
    job.rubric?.criteria.map((criterion) => criterion.name).join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return candidateRows
    .map((candidate) => {
      const candidateTerms = [
        candidate.currentTitle,
        candidate.currentCompany,
        candidate.location,
        candidate.notes,
        candidate.resumeText?.slice(0, 2000),
        candidate.skills?.join(" "),
        candidate.strengths?.join(" "),
      ]
        .filter(Boolean)
        .join(" ");
      const matchedSkills = (candidate.skills ?? []).filter((skill) =>
        jobText.includes(skill.toLowerCase()),
      );
      const titleMatch =
        candidate.currentTitle && jobText.includes(candidate.currentTitle.toLowerCase())
          ? 1
          : 0;
      const textOverlap = countOverlap(jobText, candidateTerms.toLowerCase());
      const score = clampScore(35 + matchedSkills.length * 10 + titleMatch * 15 + textOverlap * 3);

      return {
        candidateId: candidate.id,
        name: candidate.name,
        email: candidate.email,
        score,
        reasons:
          matchedSkills.length > 0
            ? [`Skill overlap: ${matchedSkills.slice(0, 4).join(", ")}`]
            : ["Profile has partial keyword overlap with the job."],
        gaps: candidate.resumeText ? [] : ["Resume context is limited."],
        nextStep: "Review profile and consider a screening call.",
      };
    })
    .filter((match) => match.score >= MIN_MATCH_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

function serializeJob(job: JobRow) {
  return {
    id: job.id,
    title: job.title,
    department: job.department,
    location: job.location,
    employmentType: job.employmentType,
    level: job.level,
    salary: {
      min: job.minSalary,
      max: job.maxSalary,
      currency: job.currency,
    },
    description: job.description,
    responsibilities: job.responsibilities,
    requirements: job.requirements,
    rubric: job.rubric?.criteria.map((criterion) => criterion.name) ?? [],
  };
}

function serializeCandidate(candidate: CandidateRow) {
  return {
    id: candidate.id,
    name: candidate.name,
    email: candidate.email,
    location: candidate.location,
    currentTitle: candidate.currentTitle,
    currentCompany: candidate.currentCompany,
    experienceYears: candidate.experienceYears,
    skills: candidate.skills ?? [],
    strengths: candidate.strengths ?? [],
    weaknesses: candidate.weaknesses ?? [],
    notes: candidate.notes,
    resumeText: candidate.resumeText?.slice(0, 1200),
  };
}

function countOverlap(jobText: string, candidateText: string) {
  const words = new Set(
    jobText
      .split(/\W+/)
      .map((word) => word.trim())
      .filter((word) => word.length > 3),
  );

  return Array.from(words).filter((word) => candidateText.includes(word)).slice(0, 8).length;
}

function clampScore(value: unknown) {
  const score = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(score)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean);
}

function normalizeString(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}
