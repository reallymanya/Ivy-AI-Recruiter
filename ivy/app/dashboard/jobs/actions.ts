"use server";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { jobs, jobStatus, type ScreeningRubric } from "@/lib/db/schema";

export type JobFormState = {
  ok: boolean;
  message: string;
};

const allowedStatuses = jobStatus.enumValues;

export async function createJob(
  _previousState: JobFormState,
  formData: FormData,
): Promise<JobFormState> {
  await auth.protect();

  const title = getFormString(formData, "title");
  const department = getFormString(formData, "department");
  const location = getFormString(formData, "location");
  const employmentType = getFormString(formData, "employmentType");
  const level = getFormString(formData, "level");
  const minSalary = getOptionalInteger(formData, "minSalary");
  const maxSalary = getOptionalInteger(formData, "maxSalary");
  const currency = getFormString(formData, "currency");
  const description = getFormString(formData, "description");
  const responsibilities = getFormString(formData, "responsibilities");
  const requirements = getFormString(formData, "requirements");
  const status = normalizeJobStatus(getFormString(formData, "status"));
  const rubric = getRubric(formData);

  if (!title) {
    return { ok: false, message: "Job title is required." };
  }

  await db.insert(jobs).values({
    title,
    department: department || null,
    location: location || null,
    employmentType: employmentType || null,
    level: level || null,
    minSalary,
    maxSalary,
    currency: currency || null,
    description: description || null,
    responsibilities: responsibilities || null,
    requirements: requirements || null,
    status,
    rubric,
  });

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard");

  return { ok: true, message: "Job saved." };
}

export async function updateJobStatus(formData: FormData) {
  await auth.protect();

  const jobId = getFormString(formData, "jobId");
  const status = normalizeJobStatus(getFormString(formData, "status"));

  if (!jobId) {
    return;
  }

  await db
    .update(jobs)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard");
}

export async function updateJobStatusById(
  jobId: string,
  status: (typeof jobStatus.enumValues)[number],
) {
  await auth.protect();

  if (!jobId) {
    return;
  }

  await db
    .update(jobs)
    .set({
      status: normalizeJobStatus(status),
      updatedAt: new Date(),
    })
    .where(eq(jobs.id, jobId));

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard");
}

export async function deleteJob(formData: FormData) {
  await auth.protect();

  const jobId = getFormString(formData, "jobId");

  if (!jobId) {
    return;
  }

  await db.delete(jobs).where(eq(jobs.id, jobId));

  revalidatePath("/dashboard/jobs");
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

function normalizeJobStatus(value: string): (typeof jobStatus.enumValues)[number] {
  if (value === "expired") {
    return "closed";
  }

  return allowedStatuses.includes(value as (typeof jobStatus.enumValues)[number])
    ? (value as (typeof jobStatus.enumValues)[number])
    : "draft";
}

function getRubric(formData: FormData): ScreeningRubric | null {
  const criteria = getFormString(formData, "rubric")
    .split(/\r?\n|,/)
    .map((criterion) => criterion.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((criterion) => ({
      name: criterion,
      weight: 1,
    }));

  return criteria.length > 0 ? { criteria } : null;
}
