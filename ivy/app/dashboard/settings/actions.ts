"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { getDashboardUser } from "@/lib/auth/dashboard-user";
import { db } from "@/lib/db";
import { recruiterSettings } from "@/lib/db/schema";

export type SettingsFormState = { ok: boolean; message: string };

export async function saveRecruiterSettings(
  _state: SettingsFormState,
  formData: FormData,
): Promise<SettingsFormState> {
  const user = await getDashboardUser();
  const values = {
    companyName: text(formData, "companyName") || "Ivy Recruiting Team",
    agentName: text(formData, "agentName") || "Ivy",
    voiceId: text(formData, "voiceId") || "Abhinav",
    voiceStyle: text(formData, "voiceStyle") || "Conversational",
    voiceLocale: text(formData, "voiceLocale") || "en-IN",
    screeningQuestionCount: count(formData, "screeningQuestionCount", 6),
    technicalQuestionCount: count(formData, "technicalQuestionCount", 8),
    hrFinalQuestionCount: count(formData, "hrFinalQuestionCount", 5),
    silenceTimeoutSeconds: bounded(formData, "silenceTimeoutSeconds", 30, 10, 120),
    allowFollowUps: formData.get("allowFollowUps") === "on",
    interviewPrompt: text(formData, "interviewPrompt") || null,
    evaluationPrompt: text(formData, "evaluationPrompt") || null,
    closingMessage: text(formData, "closingMessage") || null,
    companyLogoUrl: text(formData, "companyLogoUrl") || null,
    emailSubjectTemplate: text(formData, "emailSubjectTemplate") || null,
    emailIntro: text(formData, "emailIntro") || null,
    replyToEmail: text(formData, "replyToEmail") || null,
    recruiterNotifications: formData.get("recruiterNotifications") === "on",
    notificationEmail: text(formData, "notificationEmail") || user.email,
    lowScoreAlerts: formData.get("lowScoreAlerts") === "on",
    lowScoreThreshold: bounded(formData, "lowScoreThreshold", 60, 0, 100),
    defaultJobLocation: text(formData, "defaultJobLocation") || null,
    defaultJobCurrency: text(formData, "defaultJobCurrency") || "INR",
    defaultEmploymentType: text(formData, "defaultEmploymentType") || "Full-time",
    timezone: text(formData, "timezone") || "Asia/Kolkata",
    updatedAt: new Date(),
  };

  const existing = await db.query.recruiterSettings.findFirst({
    where: eq(recruiterSettings.userId, user.id),
    columns: { id: true },
  });

  if (existing) {
    await db.update(recruiterSettings).set(values).where(eq(recruiterSettings.id, existing.id));
  } else {
    await db.insert(recruiterSettings).values({ userId: user.id, ...values });
  }

  revalidatePath("/dashboard/settings");
  return { ok: true, message: "AI recruiter settings saved." };
}

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function count(formData: FormData, key: string, fallback: number) {
  const value = Number.parseInt(text(formData, key), 10);
  return Number.isFinite(value) ? Math.min(15, Math.max(3, value)) : fallback;
}

function bounded(formData: FormData, key: string, fallback: number, min: number, max: number) {
  const value = Number.parseInt(text(formData, key), 10);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}
