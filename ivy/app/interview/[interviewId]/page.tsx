import { CalendarClock, Clock, Mic, PanelTop, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getPlaceholderInterview } from "./interview-data";
import { InterviewStartForm } from "./interview-start-form";

type InterviewPageProps = {
  params: Promise<{
    interviewId: string;
  }>;
  searchParams: Promise<{
    type?: string;
  }>;
};

export async function generateMetadata({ params }: InterviewPageProps): Promise<Metadata> {
  const { interviewId } = await params;

  return {
    title: `Interview ${interviewId} | Ivy Recruiter`,
    description: "Join your Ivy Recruiter AI interview.",
  };
}

export default async function InterviewPage({ params, searchParams }: InterviewPageProps) {
  const { interviewId } = await params;
  const { type } = await searchParams;
  const interviewType = normalizeInterviewType(type);
  const interviewDetails = getPlaceholderInterview(interviewId, interviewType);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-white">
              <PanelTop className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold">Ivy Recruiter</p>
              <p className="text-xs text-zinc-500">Candidate interview portal</p>
            </div>
          </div>
          <Badge variant="secondary" className="hidden rounded-full sm:inline-flex">
            Public interview link
          </Badge>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid w-full gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-6">
            <div>
              <Badge variant="secondary" className="mb-4 rounded-full">
                Interview portal
              </Badge>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Welcome to your Ivy interview.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
                You are about to join a structured AI screening conversation. Please confirm your
                name before starting so the recruiter can match the interview to your application.
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardDescription>Interview details</CardDescription>
                <CardTitle>{interviewDetails.role}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 text-sm text-zinc-600 sm:grid-cols-2">
                <DetailItem icon={CalendarClock} label="Schedule" value={interviewDetails.schedule} />
                <DetailItem icon={Clock} label="Estimated time" value={interviewDetails.duration} />
                <DetailItem icon={Mic} label="Format" value={interviewDetails.format} />
                <DetailItem icon={ShieldCheck} label="Interview ID" value={interviewDetails.id} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardDescription>What to expect</CardDescription>
                <CardTitle>A short screening conversation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-6 text-zinc-600">
                <p>
                  Ivy will ask a few role-specific questions, listen to your answers, and create a
                  transcript for the recruiting team.
                </p>
                <p>
                  Find a quiet place, keep your microphone and camera ready, and answer naturally.
                  This placeholder page will later load the real role, candidate, and schedule
                  details from the interview link.
                </p>
              </CardContent>
            </Card>
          </div>

          <InterviewStartForm interviewId={interviewId} interviewType={interviewType} />
        </section>
      </div>
    </main>
  );
}

function normalizeInterviewType(value: string | undefined) {
  return value === "technical" || value === "hr_final" ? value : "screening";
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg border border-zinc-200 bg-white p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-zinc-950" />
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
        <p className="mt-1 font-medium text-zinc-900">{value}</p>
      </div>
    </div>
  );
}
