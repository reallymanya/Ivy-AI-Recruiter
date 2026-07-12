"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { candidates } from "@/lib/db/schema";
import { getDashboardUser } from "@/lib/auth/dashboard-user";

export type CandidateFormState = {
  ok: boolean;
  message: string;
};

export async function createCandidate(
  _previousState: CandidateFormState,
  formData: FormData,
): Promise<CandidateFormState> {
  const recruiter = await getDashboardUser();

  const name = getFormString(formData, "name");
  const email = getFormString(formData, "email");
  const phone = getFormString(formData, "phone");
  const location = getFormString(formData, "location");
  const currentTitle = getFormString(formData, "currentTitle");
  const currentCompany = getFormString(formData, "currentCompany");
  const linkedinUrl = getFormString(formData, "linkedinUrl");
  const portfolioUrl = getFormString(formData, "portfolioUrl");
  const experienceYears = getOptionalInteger(formData, "experienceYears");
  const skills = getCommaSeparatedList(formData, "skills");
  const strengths = getCommaSeparatedList(formData, "strengths");
  const weaknesses = getCommaSeparatedList(formData, "weaknesses");
  const source = getFormString(formData, "source");
  const notes = getFormString(formData, "notes");
  const resumeText = getFormString(formData, "resumeText");
  const resumeFileName = getFormString(formData, "resumeFileName");
  const resumeFileType = getFormString(formData, "resumeFileType");
  const resumeFileData = getFormString(formData, "resumeFileData");

  if (!name) {
    return { ok: false, message: "Candidate name is required." };
  }

  await db.insert(candidates).values({
    recruiterId: recruiter.id,
    name,
    email: email || null,
    phone: phone || null,
    location: location || null,
    currentTitle: currentTitle || null,
    currentCompany: currentCompany || null,
    linkedinUrl: linkedinUrl || null,
    portfolioUrl: portfolioUrl || null,
    experienceYears,
    skills,
    strengths,
    weaknesses,
    source: source || null,
    notes: notes || null,
    resumeText: resumeText || null,
    resumeFileName: resumeFileName || null,
    resumeFileType: resumeFileType || null,
    resumeFileData: resumeFileData || null,
  });

  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard");

  return { ok: true, message: "Candidate saved." };
}

export async function deleteCandidate(formData: FormData) {
  const recruiter = await getDashboardUser();

  const candidateId = getFormString(formData, "candidateId");

  if (!candidateId) {
    return;
  }

  await db.delete(candidates).where(and(eq(candidates.id, candidateId), eq(candidates.recruiterId, recruiter.id)));

  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard");
}

function getFormString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value.trim() : "";
}

function getOptionalInteger(formData: FormData, key: string) {
  const rawValue = getFormString(formData, key);

  if (!rawValue) {
    return null;
  }

  const value = Number.parseInt(rawValue, 10);

  return Number.isFinite(value) ? value : null;
}

function getCommaSeparatedList(formData: FormData, key: string) {
  const items = getFormString(formData, key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : null;
}
