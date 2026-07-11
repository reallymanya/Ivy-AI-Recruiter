"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, Mail, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type CandidateMatch = {
  candidateId: string;
  name: string;
  email: string | null;
  score: number;
  reasons: string[];
  gaps: string[];
  nextStep: string;
};

type InviteResult = {
  candidateId: string;
  name: string;
  email: string | null;
  interviewLink?: string;
  status: "sent" | "skipped" | "failed";
  message: string;
};

type DialogStep = "matches" | "invite";
type InterviewType = "screening" | "technical" | "hr_final";

const interviewTypeOptions: Array<{ value: InterviewType; label: string }> = [
  { value: "screening", label: "Screening interview" },
  { value: "technical", label: "Tech interview" },
  { value: "hr_final", label: "HR final interview" },
];

export function MatchingCandidatesDialog({
  jobId,
  jobTitle,
}: {
  jobId: string;
  jobTitle: string;
}) {
  const [open, setOpen] = useState(false);
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [source, setSource] = useState<"ai" | "fallback" | "">("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<DialogStep>("matches");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [interviewType, setInterviewType] = useState<InterviewType>("screening");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailDraftSource, setEmailDraftSource] = useState<"ai" | "fallback" | "">("");
  const [emailDraftError, setEmailDraftError] = useState("");
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);
  const [inviteResults, setInviteResults] = useState<InviteResult[]>([]);
  const [inviteError, setInviteError] = useState("");
  const [isSendingInvites, setIsSendingInvites] = useState(false);

  const selectedCandidates = useMemo(
    () => matches.filter((match) => selectedCandidateIds.includes(match.candidateId)),
    [matches, selectedCandidateIds],
  );
  const allCandidatesSelected = matches.length > 0 && selectedCandidateIds.length === matches.length;

  async function findMatches() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/jobs/match-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });
      const payload = await readJsonResponse<{
        matches?: CandidateMatch[];
        source?: "ai" | "fallback";
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(payload.error || "Candidate matching failed.");
      }

      setMatches(payload.matches ?? []);
      setSelectedCandidateIds([]);
      setStep("matches");
      resetInviteState();
      setSource(payload.source ?? "");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Candidate matching failed.");
    } finally {
      setIsLoading(false);
    }
  }

  function toggleCandidate(candidateId: string) {
    setSelectedCandidateIds((current) =>
      current.includes(candidateId)
        ? current.filter((id) => id !== candidateId)
        : [...current, candidateId],
    );
    setInviteResults([]);
    setInviteError("");
  }

  function toggleAllCandidates() {
    setSelectedCandidateIds(allCandidatesSelected ? [] : matches.map((match) => match.candidateId));
    setInviteResults([]);
    setInviteError("");
  }

  function goToInviteStep() {
    setStep("invite");

    if (!emailSubject.trim() || !emailBody.trim()) {
      void generateInviteEmailDraft();
    }
  }

  async function generateInviteEmailDraft(nextInterviewType = interviewType) {
    setEmailDraftError("");
    setIsGeneratingEmail(true);

    try {
      const response = await fetch("/api/jobs/generate-invite-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          interviewType: nextInterviewType,
          candidateNames: selectedCandidates.map((candidate) => candidate.name),
        }),
      });
      const payload = await readJsonResponse<{
        subject?: string;
        body?: string;
        source?: "ai" | "fallback";
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(payload.error || "Email generation failed.");
      }

      setEmailSubject(payload.subject ?? "");
      setEmailBody(payload.body ?? "");
      setEmailDraftSource(payload.source ?? "");
    } catch (error) {
      setEmailDraftError(error instanceof Error ? error.message : "Email generation failed.");
    } finally {
      setIsGeneratingEmail(false);
    }
  }

  async function sendInvites() {
    setInviteError("");
    setInviteResults([]);
    setIsSendingInvites(true);

    try {
      let subject = emailSubject;
      let body = emailBody;

      if (!subject.trim() || !body.trim()) {
        const draft = await fetchInviteEmailDraft();
        subject = draft.subject;
        body = draft.body;
        setEmailSubject(subject);
        setEmailBody(body);
        setEmailDraftSource(draft.source);
      }

      const response = await fetch("/api/jobs/send-invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          candidateIds: selectedCandidateIds,
          interviewType,
          emailSubject: subject,
          emailBody: body,
        }),
      });
      const payload = await readJsonResponse<{
        results?: InviteResult[];
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(payload.error || "Invite sending failed.");
      }

      setInviteResults(payload.results ?? []);
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Invite sending failed.");
    } finally {
      setIsSendingInvites(false);
    }
  }

  async function fetchInviteEmailDraft() {
    const response = await fetch("/api/jobs/generate-invite-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobId,
        interviewType,
        candidateNames: selectedCandidates.map((candidate) => candidate.name),
      }),
    });
    const payload = await readJsonResponse<{
      subject?: string;
      body?: string;
      source?: "ai" | "fallback";
      error?: string;
    }>(response);

    if (!response.ok) {
      throw new Error(payload.error || "Email generation failed.");
    }

    return {
      subject: payload.subject ?? "",
      body: payload.body ?? "",
      source: payload.source ?? "fallback",
    };
  }

  function resetInviteState() {
    setEmailSubject("");
    setEmailBody("");
    setEmailDraftSource("");
    setEmailDraftError("");
    setInviteResults([]);
    setInviteError("");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);

        if (nextOpen && matches.length === 0 && !isLoading) {
          void findMatches();
        }
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>
        <Sparkles className="size-4" />
        Find Matching Candidates
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl p-6 sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Matching Candidates</DialogTitle>
          <DialogDescription>
            Ranked matches for {jobTitle}
            {source === "fallback" ? " using a basic keyword match." : "."}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex min-h-44 items-center justify-center gap-2 text-sm text-zinc-600">
            <LoaderCircle className="size-4 animate-spin" />
            Finding matches...
          </div>
        ) : error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p>
        ) : matches.length === 0 ? (
          <p className="rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
            No candidates found with a match score of 70% or higher.
          </p>
        ) : step === "invite" ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="ghost" onClick={() => setStep("matches")}>
                <ArrowLeft className="size-4" />
                Back to matches
              </Button>
              <Badge variant="secondary" className="rounded-full">
                {selectedCandidates.length} selected
              </Badge>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-sm font-medium">Interview type</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {interviewTypeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 p-3 text-sm hover:bg-zinc-50"
                  >
                    <input
                      type="radio"
                      name="interviewType"
                      value={option.value}
                      checked={interviewType === option.value}
                      onChange={() => {
                        setInterviewType(option.value);
                        setInviteResults([]);
                        void generateInviteEmailDraft(option.value);
                      }}
                      className="size-4 accent-zinc-950"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-zinc-50 p-4">
              <p className="text-sm font-medium">Candidates receiving invite</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCandidates.map((candidate) => (
                  <Badge key={candidate.candidateId} variant="secondary" className="rounded-full">
                    {candidate.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium">Email invite draft</p>
                  <p className="text-xs text-zinc-500">
                    {emailDraftSource === "ai"
                      ? "AI draft generated. Edit before sending."
                      : "Template draft ready. Edit before sending."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isGeneratingEmail || isSendingInvites}
                  onClick={() => generateInviteEmailDraft()}
                >
                  {isGeneratingEmail ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  Generate draft
                </Button>
              </div>
              {emailDraftError ? (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {emailDraftError}
                </p>
              ) : null}
              <div className="grid gap-2">
                <Label htmlFor="invite-subject">Subject</Label>
                <Input
                  id="invite-subject"
                  value={emailSubject}
                  onChange={(event) => setEmailSubject(event.target.value)}
                  placeholder="Interview invite for {{jobTitle}}"
                  className="bg-white"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="invite-body">Message</Label>
                <Textarea
                  id="invite-body"
                  value={emailBody}
                  onChange={(event) => setEmailBody(event.target.value)}
                  placeholder="Hi {{candidateName}}, ..."
                  className="min-h-40 bg-white"
                />
                <p className="text-xs text-zinc-500">
                  Use {"{{candidateName}}"}, {"{{jobTitle}}"}, and {"{{interviewLink}}"} as
                  placeholders.
                </p>
              </div>
            </div>

            {inviteError ? (
              <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{inviteError}</p>
            ) : null}
            {inviteResults.length > 0 ? (
              <div className="grid gap-2">
                {inviteResults.map((result) => (
                  <div
                    key={result.candidateId}
                    className="rounded-lg border border-zinc-200 bg-white p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{result.name}</p>
                        <p className="mt-1 text-zinc-600">{result.message}</p>
                        {result.email ? (
                          <p className="mt-1 text-xs text-zinc-500">{result.email}</p>
                        ) : null}
                        {result.interviewLink ? (
                          <a
                            href={result.interviewLink}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex text-zinc-700 hover:text-zinc-950"
                          >
                            {result.interviewLink}
                          </a>
                        ) : null}
                      </div>
                      <Badge variant="secondary" className="rounded-full">
                        {result.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <Button
              type="button"
              disabled={
                selectedCandidateIds.length === 0 ||
                isGeneratingEmail ||
                isSendingInvites ||
                !emailSubject.trim() ||
                !emailBody.trim()
              }
              onClick={sendInvites}
              className="justify-self-end"
            >
              {isSendingInvites ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Mail className="size-4" />
              )}
              Send invite with interview link
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-zinc-50 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={allCandidatesSelected}
                  onChange={toggleAllCandidates}
                  className="size-4 accent-zinc-950"
                />
                Select all matching candidates
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full">
                  {selectedCandidates.length} selected
                </Badge>
                <Button
                  type="button"
                  disabled={selectedCandidateIds.length === 0}
                  onClick={goToInviteStep}
                >
                  <Mail className="size-4" />
                  Send invite
                </Button>
              </div>
            </div>
            {matches.map((match) => (
              <div key={match.candidateId} className="rounded-lg border border-zinc-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCandidateIds.includes(match.candidateId)}
                      onChange={() => toggleCandidate(match.candidateId)}
                      className="mt-1 size-4 shrink-0 accent-zinc-950"
                      aria-label={`Select ${match.name}`}
                    />
                    <div className="min-w-0">
                      <h3 className="font-semibold">{match.name}</h3>
                      <p className="mt-1 text-sm text-zinc-600">{match.nextStep}</p>
                      {match.email ? (
                        <p className="mt-1 truncate text-xs text-zinc-500">{match.email}</p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      {match.score}%
                    </Badge>
                    <Button
                      nativeButton={false}
                      variant="outline"
                      size="sm"
                      render={<Link href={`/dashboard/candidates/${match.candidateId}`} />}
                    >
                      <UserRound className="size-3.5" />
                      View profile
                    </Button>
                  </div>
                </div>

                {match.reasons.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Match reasons
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm leading-6 text-zinc-600">
                      {match.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {match.gaps.length > 0 ? (
                  <div className="mt-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Gaps
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm leading-6 text-zinc-600">
                      {match.gaps.map((gap) => (
                        <li key={gap}>{gap}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

async function readJsonResponse<T extends { error?: string }>(response: Response): Promise<T> {
  const responseText = await response.text();

  if (!responseText.trim()) {
    return {
      error: `Server returned an empty response (${response.status}).`,
    } as T;
  }

  try {
    return JSON.parse(responseText) as T;
  } catch {
    return {
      error: responseText.slice(0, 500) || `Server returned a non-JSON response (${response.status}).`,
    } as T;
  }
}
