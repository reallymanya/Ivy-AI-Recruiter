"use client";

import { useMemo, useState } from "react";
import { CalendarClock, CheckCircle2, ChevronRight, Search, UserRound } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Progress } from "@/components/ui/progress";

export type InterviewWorkspaceJob = {
  id: string;
  title: string;
};

export type InterviewWorkspaceSession = {
  id: string;
  jobId: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string | null;
  candidateTitle: string | null;
  interviewType: string | null;
  status: "scheduled" | "in_progress" | "completed" | "needs_review" | "cancelled";
  invitedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  overallScore: number | null;
  recommendation: string | null;
};

const typeLabels: Record<string, string> = {
  screening: "Screening",
  technical: "Technical",
  hr_final: "HR Final",
};

const recommendationLabels: Record<string, string> = {
  strong_yes: "Strong yes",
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
  strong_no: "Strong no",
};

export function InterviewsWorkspace({
  jobs,
  sessions,
  defaultJobId,
  timezone,
}: {
  jobs: InterviewWorkspaceJob[];
  sessions: InterviewWorkspaceSession[];
  defaultJobId: string;
  timezone: string;
}) {
  const [jobId, setJobId] = useState(defaultJobId);
  const [query, setQuery] = useState("");
  const [interviewType, setInterviewType] = useState("all");

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return sessions.filter((session) => {
      const matchesJob = session.jobId === jobId;
      const matchesType = interviewType === "all" || session.interviewType === interviewType;
      const searchable = [session.candidateName, session.candidateEmail, session.candidateTitle]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesJob && matchesType && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [interviewType, jobId, query, sessions]);

  const invited = filteredSessions.filter(
    (session) =>
      session.invitedAt &&
      ["scheduled", "in_progress", "needs_review"].includes(session.status),
  );
  const completed = filteredSessions.filter((session) => session.status === "completed");

  if (jobs.length === 0) {
    return (
      <Card className="border-dashed border-zinc-300 shadow-none">
        <CardContent className="flex min-h-64 flex-col items-center justify-center text-center">
          <CalendarClock className="size-9 text-zinc-400" />
          <p className="mt-4 font-medium">No jobs available</p>
          <p className="mt-1 max-w-sm text-sm text-zinc-500">
            Create a job and send candidate invitations to start tracking interviews.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(280px,1.5fr)_200px]">
        <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
          Job
          <NativeSelect className="w-full" value={jobId} onChange={(event) => setJobId(event.target.value)}>
            {jobs.map((job) => (
              <NativeSelectOption key={job.id} value={job.id}>
                {job.title}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-zinc-600">
          Search candidates
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Name, email, or role"
              className="pl-9"
            />
          </span>
        </label>
        <label className="grid gap-1.5 text-xs font-medium text-zinc-600 sm:col-span-2 xl:col-span-1">
          Interview type
          <NativeSelect
            className="w-full"
            value={interviewType}
            onChange={(event) => setInterviewType(event.target.value)}
          >
            <NativeSelectOption value="all">All types</NativeSelectOption>
            <NativeSelectOption value="screening">Screening</NativeSelectOption>
            <NativeSelectOption value="technical">Technical</NativeSelectOption>
            <NativeSelectOption value="hr_final">HR Final</NativeSelectOption>
          </NativeSelect>
        </label>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-2">
        <InterviewColumn
          title="Invited candidates"
          count={invited.length}
          icon={<CalendarClock className="size-4" />}
          emptyText="No pending invitations match these filters."
        >
          {invited.map((session) => (
            <CandidateRow key={session.id} session={session} mode="invited" timezone={timezone} />
          ))}
        </InterviewColumn>

        <InterviewColumn
          title="Completed interviews"
          count={completed.length}
          icon={<CheckCircle2 className="size-4" />}
          emptyText="No completed interviews match these filters."
        >
          {completed.map((session) => (
            <CandidateRow key={session.id} session={session} mode="completed" timezone={timezone} />
          ))}
        </InterviewColumn>
      </div>
    </div>
  );
}

function InterviewColumn({
  title,
  count,
  icon,
  emptyText,
  children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-zinc-200 bg-white shadow-sm">
      <CardHeader className="border-b border-zinc-100">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">{icon}{title}</span>
          <Badge variant="secondary" className="tabular-nums">{count}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 p-4">
        {count ? children : (
          <div className="flex min-h-44 flex-col items-center justify-center text-center text-sm text-zinc-500">
            <UserRound className="mb-3 size-7 text-zinc-300" />
            {emptyText}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CandidateRow({
  session,
  mode,
  timezone,
}: {
  session: InterviewWorkspaceSession;
  mode: "invited" | "completed";
  timezone: string;
}) {
  const date = mode === "completed" ? session.completedAt : session.startedAt ?? session.invitedAt;
  const subtitle = session.candidateTitle || session.candidateEmail || "Candidate profile";

  const primaryHref =
    mode === "completed"
      ? `/dashboard/interviews/${session.id}`
      : `/dashboard/candidates/${session.candidateId}`;

  return (
    <div className="grid gap-3 rounded-md border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:bg-zinc-50">
      <div className="flex min-w-0 items-start gap-3">
        <Avatar className="size-10 shrink-0">
          <AvatarFallback>{getInitials(session.candidateName)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{session.candidateName}</p>
              <p className="mt-0.5 truncate text-xs text-zinc-500">{subtitle}</p>
            </div>
            <Link
              href={`/dashboard/candidates/${session.candidateId}`}
              className="shrink-0 text-xs font-medium text-zinc-600 underline-offset-4 hover:text-zinc-950 hover:underline"
            >
              Full profile
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{typeLabels[session.interviewType ?? ""] ?? "Interview"}</Badge>
            <Badge variant="secondary">{formatStatus(session.status)}</Badge>
            {date ? <span className="text-xs text-zinc-500">{formatDate(date, timezone)}</span> : null}
          </div>
        </div>
      </div>

      {mode === "completed" ? (
        <div className="grid gap-2 border-t border-zinc-100 pt-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="text-zinc-500">
              {session.recommendation
                ? recommendationLabels[session.recommendation] ?? formatStatus(session.recommendation)
                : "Review pending"}
            </span>
            <span className="font-semibold tabular-nums">
              {session.overallScore === null ? "Result pending" : `${session.overallScore}%`}
            </span>
          </div>
          {session.overallScore !== null ? <Progress value={session.overallScore} /> : null}
        </div>
      ) : null}

      <Link
        href={primaryHref}
        className="group flex items-center justify-between border-t border-zinc-100 pt-3 text-sm font-medium text-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950"
      >
        {mode === "completed" ? "View AI analysis" : "View candidate"}
        <ChevronRight className="size-4 text-zinc-400 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: timezone }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C";
}
