CREATE TABLE "recruiter_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" text DEFAULT 'Ivy Recruiting Team' NOT NULL,
	"agent_name" text DEFAULT 'Ivy' NOT NULL,
	"voice_id" text DEFAULT 'Abhinav' NOT NULL,
	"voice_style" text DEFAULT 'Conversational' NOT NULL,
	"voice_locale" text DEFAULT 'en-IN' NOT NULL,
	"screening_question_count" integer DEFAULT 6 NOT NULL,
	"technical_question_count" integer DEFAULT 8 NOT NULL,
	"hr_final_question_count" integer DEFAULT 5 NOT NULL,
	"silence_timeout_seconds" integer DEFAULT 30 NOT NULL,
	"allow_follow_ups" boolean DEFAULT true NOT NULL,
	"interview_prompt" text,
	"evaluation_prompt" text,
	"closing_message" text,
	"company_logo_url" text,
	"email_subject_template" text,
	"email_intro" text,
	"reply_to_email" text,
	"recruiter_notifications" boolean DEFAULT true NOT NULL,
	"notification_email" text,
	"low_score_alerts" boolean DEFAULT true NOT NULL,
	"low_score_threshold" integer DEFAULT 60 NOT NULL,
	"default_job_location" text,
	"default_job_currency" text DEFAULT 'INR' NOT NULL,
	"default_employment_type" text DEFAULT 'Full-time' NOT NULL,
	"timezone" text DEFAULT 'Asia/Kolkata' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "current_title" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "current_company" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "linkedin_url" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "portfolio_url" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "experience_years" integer;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "skills" jsonb;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "strengths" jsonb;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "weaknesses" jsonb;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "resume_file_name" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "resume_file_type" text;--> statement-breakpoint
ALTER TABLE "candidates" ADD COLUMN "resume_file_data" text;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "recruiter_id" uuid;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "interview_type" text;--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD COLUMN "invited_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "employment_type" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "level" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "min_salary" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "max_salary" integer;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "currency" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "responsibilities" text;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN "requirements" text;--> statement-breakpoint
ALTER TABLE "recruiter_settings" ADD CONSTRAINT "recruiter_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recruiter_settings_user_idx" ON "recruiter_settings" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "interview_sessions" ADD CONSTRAINT "interview_sessions_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;