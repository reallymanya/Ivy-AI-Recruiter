import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getQuestionCount, getSettingsForInterview } from "@/lib/interview/agent-settings";
import { getPlaceholderInterview } from "../interview-data";
import { InterviewRoom } from "../interview-room";

type InterviewRoomPageProps = {
  params: Promise<{
    interviewId: string;
  }>;
  searchParams: Promise<{
    name?: string;
    type?: string;
  }>;
};

export default async function InterviewRoomPage({ params, searchParams }: InterviewRoomPageProps) {
  const { interviewId } = await params;
  const { name, type } = await searchParams;
  const candidateName = name?.trim();

  if (!candidateName) {
    redirect(`/interview/${interviewId}`);
  }

  const interviewType = normalizeInterviewType(type);
  const settings = await getSettingsForInterview(interviewId);
  const interviewDetails = {
    ...getPlaceholderInterview(interviewId, interviewType),
    company: settings.companyName,
  };

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold">Ivy Recruiter</p>
            <p className="text-xs text-zinc-500">Live candidate interview</p>
          </div>
          <Badge variant="secondary" className="rounded-full">
            {interviewDetails.id}
          </Badge>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <InterviewRoom
          interviewDetails={interviewDetails}
          initialCandidateName={candidateName}
          agentName={settings.agentName}
          maxQuestions={getQuestionCount(settings, interviewType)}
          silenceTimeoutSeconds={settings.silenceTimeoutSeconds}
          closingMessage={settings.closingMessage}
        />
      </div>
    </main>
  );
}

function normalizeInterviewType(value: string | undefined) {
  return value === "technical" || value === "hr_final" ? value : "screening";
}
