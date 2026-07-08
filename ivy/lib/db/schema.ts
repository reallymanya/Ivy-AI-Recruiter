import { relations } from "drizzle-orm";
import {
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

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    department: text("department"),
    location: text("location"),
    status: jobStatus("status").notNull().default("draft"),
    description: text("description"),
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
    source: text("source"),
    resumeText: text("resume_text"),
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
    status: interviewStatus("status").notNull().default("scheduled"),
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

export const candidatesRelations = relations(candidates, ({ many }) => ({
  interviewSessions: many(interviewSessions),
}));

export const interviewSessionsRelations = relations(interviewSessions, ({ one, many }) => ({
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
