import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { interviewSessions, recruiterSettings } from "@/lib/db/schema";

export const defaultAgentSettings = {
  companyName: "Ivy Recruiting Team",
  agentName: "Ivy",
  voiceId: "Abhinav",
  voiceStyle: "Conversational",
  voiceLocale: "en-IN",
  screeningQuestionCount: 6,
  technicalQuestionCount: 8,
  hrFinalQuestionCount: 5,
  silenceTimeoutSeconds: 30,
  allowFollowUps: true,
  interviewPrompt: "",
  evaluationPrompt: "",
  closingMessage: "Thank you for your time. Your interview is now complete, and the recruiting team will review your responses and contact you about the next step.",
  companyLogoUrl: "",
  emailSubjectTemplate: "Interview invite for {{jobTitle}}",
  emailIntro: "Thank you for your interest. We would like to invite you to the next interview step.",
  replyToEmail: "",
  recruiterNotifications: true,
  notificationEmail: "",
  lowScoreAlerts: true,
  lowScoreThreshold: 60,
  defaultJobLocation: "",
  defaultJobCurrency: "INR",
  defaultEmploymentType: "Full-time",
  timezone: "Asia/Kolkata",
};

export type AgentSettings = typeof defaultAgentSettings;

export async function getSettingsForUser(userId: string): Promise<AgentSettings> {
  const [settings] = await db
    .select()
    .from(recruiterSettings)
    .where(eq(recruiterSettings.userId, userId))
    .limit(1);

  return settings ? toAgentSettings(settings) : defaultAgentSettings;
}

export async function getSettingsForInterview(interviewId: string): Promise<AgentSettings> {
  if (!isUuid(interviewId)) return defaultAgentSettings;

  const session = await db.query.interviewSessions.findFirst({
    where: eq(interviewSessions.id, interviewId),
    columns: { recruiterId: true },
  });

  if (session?.recruiterId) return getSettingsForUser(session.recruiterId);

  // Older sessions predate recruiter ownership. Use a legacy fallback only when unambiguous.
  const legacySettings = await db.select().from(recruiterSettings).limit(2);
  return legacySettings.length === 1 ? toAgentSettings(legacySettings[0]) : defaultAgentSettings;
}

export function getQuestionCount(
  settings: AgentSettings,
  interviewType: "screening" | "technical" | "hr_final",
) {
  if (interviewType === "technical") return settings.technicalQuestionCount;
  if (interviewType === "hr_final") return settings.hrFinalQuestionCount;
  return settings.screeningQuestionCount;
}

function toAgentSettings(settings: typeof recruiterSettings.$inferSelect): AgentSettings {
  return {
    companyName: settings.companyName,
    agentName: settings.agentName,
    voiceId: settings.voiceId,
    voiceStyle: settings.voiceStyle,
    voiceLocale: settings.voiceLocale,
    screeningQuestionCount: settings.screeningQuestionCount,
    technicalQuestionCount: settings.technicalQuestionCount,
    hrFinalQuestionCount: settings.hrFinalQuestionCount,
    silenceTimeoutSeconds: settings.silenceTimeoutSeconds,
    allowFollowUps: settings.allowFollowUps,
    interviewPrompt: settings.interviewPrompt ?? "",
    evaluationPrompt: settings.evaluationPrompt ?? "",
    closingMessage: settings.closingMessage ?? defaultAgentSettings.closingMessage,
    companyLogoUrl: settings.companyLogoUrl ?? "",
    emailSubjectTemplate: settings.emailSubjectTemplate ?? defaultAgentSettings.emailSubjectTemplate,
    emailIntro: settings.emailIntro ?? defaultAgentSettings.emailIntro,
    replyToEmail: settings.replyToEmail ?? "",
    recruiterNotifications: settings.recruiterNotifications,
    notificationEmail: settings.notificationEmail ?? "",
    lowScoreAlerts: settings.lowScoreAlerts,
    lowScoreThreshold: settings.lowScoreThreshold,
    defaultJobLocation: settings.defaultJobLocation ?? "",
    defaultJobCurrency: settings.defaultJobCurrency,
    defaultEmploymentType: settings.defaultEmploymentType,
    timezone: settings.timezone,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
