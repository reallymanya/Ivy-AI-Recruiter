import { eq } from "drizzle-orm";
import {
  ArrowLeft,
  Award,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDashboardUser } from "@/lib/auth/dashboard-user";
import { db } from "@/lib/db";
import { interviewSessions } from "@/lib/db/schema";
import { getSettingsForInterview } from "@/lib/interview/agent-settings";

export default async function InterviewAnalysisPage({
  params,
}: {
  params: Promise<{ interviewId: string }>;
}) {
  const { interviewId } = await params;
  const [, session] = await Promise.all([
    getDashboardUser(),
    db.query.interviewSessions.findFirst({
      where: eq(interviewSessions.id, interviewId),
      with: { candidate: true, job: true, reports: true, messages: true },
    }),
  ]);

  if (!session || session.status !== "completed") notFound();

  const settings = await getSettingsForInterview(session.id);
  const report = session.reports[0] ?? null;
  const messages = [...session.messages].sort((first, second) => first.sequence - second.sequence);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Button
            nativeButton={false}
            variant="ghost"
            render={<Link href="/dashboard/interviews" />}
          >
            <ArrowLeft className="size-4" />
            Interviews
          </Button>
          <span className="flex items-center gap-2 text-sm font-semibold">
            <BriefcaseBusiness className="size-4" />
            Ivy Interview Analysis
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-7 sm:px-6">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold">{session.candidate.name}</h1>
              <Button
                nativeButton={false}
                variant="outline"
                size="sm"
                render={<Link href={`/dashboard/candidates/${session.candidate.id}`} />}
              >
                Full profile
                <ExternalLink className="size-3.5" />
              </Button>
            </div>
            <p className="mt-2 text-sm text-zinc-600">
              {session.job.title} · {typeLabels[session.interviewType ?? ""] ?? "Interview"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{formatLabel(session.recommendation ?? "review_pending")}</Badge>
            {session.completedAt ? <span className="text-xs text-zinc-500">Completed {formatDate(session.completedAt, settings.timezone)}</span> : null}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Card className="border-zinc-200 shadow-sm">
            <CardContent className="flex h-full min-h-48 flex-col justify-center p-6 text-center">
              <Award className="mx-auto size-7 text-zinc-500" />
              <p className="mt-3 text-xs font-medium uppercase text-zinc-500">Overall score</p>
              <p className="mt-1 text-4xl font-semibold tabular-nums">
                {session.overallScore === null ? "Pending" : `${session.overallScore}%`}
              </p>
              {session.overallScore !== null ? <Progress value={session.overallScore} className="mt-4" /> : null}
            </CardContent>
          </Card>

          <Card className="border-zinc-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">AI analysis</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-5">
              <p className="text-sm leading-6 text-zinc-700">
                {report?.summary || "No written AI summary was generated for this interview."}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <FindingList title="Strengths" items={report?.strengths ?? []} empty="No strengths recorded." />
                <FindingList title="Concerns" items={report?.risks ?? []} empty="No concerns recorded." />
              </div>
              {report?.nextSteps ? (
                <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
                  <p className="text-xs font-semibold uppercase text-zinc-500">Recommended next step</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-700">{report.nextSteps}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </section>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="size-4" />
              AI scorecard
            </CardTitle>
          </CardHeader>
          <CardContent>
            {report?.rubricScores?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {report.rubricScores.map((rubric) => (
                  <div key={rubric.criterion} className="rounded-md border border-zinc-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{rubric.criterion}</p>
                      <span className="text-sm font-semibold tabular-nums">{rubric.score}%</span>
                    </div>
                    <Progress value={rubric.score} className="mt-3" />
                    {rubric.evidence ? <p className="mt-3 text-xs leading-5 text-zinc-600">{rubric.evidence}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No criterion scores were generated.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-zinc-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-base">
              <span className="flex items-center gap-2"><MessageCircle className="size-4" />Full conversation transcript</span>
              <Badge variant="secondary">{messages.length} messages</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {messages.length ? (
              <div className="max-h-[640px] space-y-3 overflow-y-auto rounded-md border border-zinc-200 bg-zinc-50 p-4">
                {messages.map((message) => {
                  const isCandidate = message.speaker === "candidate";
                  return (
                    <div key={message.id} className={`flex ${isCandidate ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[88%] rounded-md border px-4 py-3 ${isCandidate ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white"}`}>
                        <p className={`text-[11px] font-semibold uppercase ${isCandidate ? "text-zinc-300" : "text-zinc-500"}`}>
                          {message.speaker === "ivy" ? "Ivy interviewer" : formatLabel(message.speaker)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No transcript was saved for this interview.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function FindingList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="text-sm font-semibold">{title}</p>
      {items.length ? (
        <ul className="mt-2 grid gap-2 text-sm text-zinc-700">
          {items.map((item) => <li key={item} className="rounded-md bg-zinc-50 px-3 py-2 leading-5">{item}</li>)}
        </ul>
      ) : <p className="mt-2 text-sm text-zinc-500">{empty}</p>}
    </div>
  );
}

const typeLabels: Record<string, string> = { screening: "Screening", technical: "Technical", hr_final: "HR Final" };

function formatLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: timezone }).format(value);
}
