import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const jobStatus = pgEnum("job_status", ["draft", "active", "paused", "closed"]);
export const interviewStatus = pgEnum("interview_status", [
  "scheduled",
  "in_progress",
  "completed",
  "needs_review",
  "cancelled",
]);
export const recommendation = pgEnum("recommendation", [
  "strong_yes",
  "yes",
  "maybe",
  "no",
  "strong_no",
]);
export const transcriptSpeaker = pgEnum("transcript_speaker", ["ivy", "candidate", "recruiter", "system"]);

export type ScreeningRubric = {
  criteria: Array<{
    name: string;
    description?: string;
    weight?: number;
  }>;
  knockoutCriteria?: string[];
};

export type RubricScores = Array<{
  criterion: string;
  score: number;
  evidence?: string;
}>;

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull(),
    email: text("email"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    imageUrl: text("image_url"),
    lastSignedInAt: timestamp("last_signed_in_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("users_clerk_user_id_idx").on(table.clerkUserId),
    index("users_email_idx").on(table.email),
  ],
);

export const recruiterSettings = pgTable(
  "recruiter_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull().default("Ivy Recruiting Team"),
    agentName: text("agent_name").notNull().default("Ivy"),
    voiceId: text("voice_id").notNull().default("Abhinav"),
    voiceStyle: text("voice_style").notNull().default("Conversational"),
    voiceLocale: text("voice_locale").notNull().default("en-IN"),
    screeningQuestionCount: integer("screening_question_count").notNull().default(6),
    technicalQuestionCount: integer("technical_question_count").notNull().default(8),
    hrFinalQuestionCount: integer("hr_final_question_count").notNull().default(5),
    silenceTimeoutSeconds: integer("silence_timeout_seconds").notNull().default(30),
    allowFollowUps: boolean("allow_follow_ups").notNull().default(true),
    interviewPrompt: text("interview_prompt"),
    evaluationPrompt: text("evaluation_prompt"),
    closingMessage: text("closing_message"),
    companyLogoUrl: text("company_logo_url"),
    emailSubjectTemplate: text("email_subject_template"),
    emailIntro: text("email_intro"),
    replyToEmail: text("reply_to_email"),
    recruiterNotifications: boolean("recruiter_notifications").notNull().default(true),
    notificationEmail: text("notification_email"),
    lowScoreAlerts: boolean("low_score_alerts").notNull().default(true),
    lowScoreThreshold: integer("low_score_threshold").notNull().default(60),
    defaultJobLocation: text("default_job_location"),
    defaultJobCurrency: text("default_job_currency").notNull().default("INR"),
    defaultEmploymentType: text("default_employment_type").notNull().default("Full-time"),
    timezone: text("timezone").notNull().default("Asia/Kolkata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("recruiter_settings_user_idx").on(table.userId)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    department: text("department"),
    location: text("location"),
    employmentType: text("employment_type"),
    level: text("level"),
    minSalary: integer("min_salary"),
    maxSalary: integer("max_salary"),
    currency: text("currency"),
    status: jobStatus("status").notNull().default("draft"),
    description: text("description"),
    responsibilities: text("responsibilities"),
    requirements: text("requirements"),
    rubric: jsonb("rubric").$type<ScreeningRubric>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("jobs_status_idx").on(table.status),
    index("jobs_created_at_idx").on(table.createdAt),
  ],
);

export const candidates = pgTable(
  "candidates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    location: text("location"),
    currentTitle: text("current_title"),
    currentCompany: text("current_company"),
    linkedinUrl: text("linkedin_url"),
    portfolioUrl: text("portfolio_url"),
    experienceYears: integer("experience_years"),
    skills: jsonb("skills").$type<string[]>(),
    strengths: jsonb("strengths").$type<string[]>(),
    weaknesses: jsonb("weaknesses").$type<string[]>(),
    source: text("source"),
    resumeText: text("resume_text"),
    resumeFileName: text("resume_file_name"),
    resumeFileType: text("resume_file_type"),
    resumeFileData: text("resume_file_data"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("candidates_email_idx").on(table.email),
    index("candidates_created_at_idx").on(table.createdAt),
  ],
);

export const interviewSessions = pgTable(
  "interview_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    recruiterId: uuid("recruiter_id").references(() => users.id, { onDelete: "set null" }),
    interviewType: text("interview_type"),
    status: interviewStatus("status").notNull().default("scheduled"),
    invitedAt: timestamp("invited_at", { withTimezone: true }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    overallScore: integer("overall_score"),
    recommendation: recommendation("recommendation"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("interview_sessions_job_idx").on(table.jobId),
    index("interview_sessions_candidate_idx").on(table.candidateId),
    index("interview_sessions_status_idx").on(table.status),
  ],
);

export const interviewMessages = pgTable(
  "interview_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => interviewSessions.id, { onDelete: "cascade" }),
    speaker: transcriptSpeaker("speaker").notNull(),
    content: text("content").notNull(),
    sequence: integer("sequence").notNull(),
    spokenAt: timestamp("spoken_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("interview_messages_session_idx").on(table.sessionId),
    index("interview_messages_sequence_idx").on(table.sessionId, table.sequence),
  ],
);

export const screeningReports = pgTable(
  "screening_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => interviewSessions.id, { onDelete: "cascade" }),
    summary: text("summary"),
    strengths: jsonb("strengths").$type<string[]>(),
    risks: jsonb("risks").$type<string[]>(),
    rubricScores: jsonb("rubric_scores").$type<RubricScores>(),
    nextSteps: text("next_steps"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("screening_reports_session_idx").on(table.sessionId)],
);

export const jobsRelations = relations(jobs, ({ many }) => ({
  interviewSessions: many(interviewSessions),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  settings: one(recruiterSettings),
  interviewSessions: many(interviewSessions),
}));

export const recruiterSettingsRelations = relations(recruiterSettings, ({ one }) => ({
  user: one(users, {
    fields: [recruiterSettings.userId],
    references: [users.id],
  }),
}));

export const candidatesRelations = relations(candidates, ({ many }) => ({
  interviewSessions: many(interviewSessions),
}));

export const interviewSessionsRelations = relations(interviewSessions, ({ one, many }) => ({
  recruiter: one(users, {
    fields: [interviewSessions.recruiterId],
    references: [users.id],
  }),
  job: one(jobs, {
    fields: [interviewSessions.jobId],
    references: [jobs.id],
  }),
  candidate: one(candidates, {
    fields: [interviewSessions.candidateId],
    references: [candidates.id],
  }),
  messages: many(interviewMessages),
  reports: many(screeningReports),
}));

export const interviewMessagesRelations = relations(interviewMessages, ({ one }) => ({
  session: one(interviewSessions, {
    fields: [interviewMessages.sessionId],
    references: [interviewSessions.id],
  }),
}));

export const screeningReportsRelations = relations(screeningReports, ({ one }) => ({
  session: one(interviewSessions, {
    fields: [screeningReports.sessionId],
    references: [interviewSessions.id],
  }),
}));
