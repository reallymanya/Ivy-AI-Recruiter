ALTER TABLE "candidates" ADD COLUMN IF NOT EXISTS "recruiter_id" uuid;--> statement-breakpoint
ALTER TABLE "jobs" ADD COLUMN IF NOT EXISTS "recruiter_id" uuid;--> statement-breakpoint
ALTER TABLE "candidates" ADD CONSTRAINT "candidates_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_recruiter_id_users_id_fk" FOREIGN KEY ("recruiter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "candidates_recruiter_idx" ON "candidates" USING btree ("recruiter_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "jobs_recruiter_idx" ON "jobs" USING btree ("recruiter_id");
