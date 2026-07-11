"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Plus, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { createCandidate, type CandidateFormState } from "./actions";

type CandidateDraft = {
  name: string;
  email: string;
  phone: string;
  location: string;
  currentTitle: string;
  currentCompany: string;
  linkedinUrl: string;
  portfolioUrl: string;
  experienceYears: string;
  skills: string;
  strengths: string;
  weaknesses: string;
  source: string;
  notes: string;
  resumeText: string;
  resumeFileName: string;
  resumeFileType: string;
  resumeFileData: string;
};

type ParsedCandidate = Partial<CandidateDraft>;

const initialDraft: CandidateDraft = {
  name: "",
  email: "",
  phone: "",
  location: "",
  currentTitle: "",
  currentCompany: "",
  linkedinUrl: "",
  portfolioUrl: "",
  experienceYears: "",
  skills: "",
  strengths: "",
  weaknesses: "",
  source: "",
  notes: "",
  resumeText: "",
  resumeFileName: "",
  resumeFileType: "",
  resumeFileData: "",
};

const initialState: CandidateFormState = {
  ok: false,
  message: "",
};

export function AddCandidateDialog() {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CandidateDraft>(initialDraft);
  const [parseStatus, setParseStatus] = useState("");
  const [parseError, setParseError] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [state, formAction, isSaving] = useActionState(createCandidate, initialState);

  useEffect(() => {
    if (!state.ok) {
      return;
    }

    queueMicrotask(() => {
      setDraft(initialDraft);
      formRef.current?.reset();
      setParseStatus("");
      setParseError("");
      setOpen(false);
    });
  }, [state.ok]);

  const helperText = useMemo(() => {
    if (parseError) {
      return parseError;
    }

    if (parseStatus) {
      return parseStatus;
    }

    return "Upload a resume for AI autofill, then review and edit manually before saving.";
  }, [parseError, parseStatus]);

  async function handleResumeUpload(file: File | undefined) {
    setParseError("");
    setParseStatus("");

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);
    setIsParsing(true);
    setParseStatus(`Reading ${file.name}...`);

    try {
      const response = await fetch("/api/candidates/parse-resume", {
        method: "POST",
        body: formData,
      });
      const responseText = await response.text();
      const payload = parseResumeUploadResponse(responseText);

      if (!response.ok) {
        throw new Error(payload.error || "Resume parsing failed.");
      }

      const candidate = payload.candidate ?? {};
      setDraft((current) => ({
        name: candidate.name ?? current.name,
        email: candidate.email ?? current.email,
        phone: candidate.phone ?? current.phone,
        location: candidate.location ?? current.location,
        currentTitle: candidate.currentTitle ?? current.currentTitle,
        currentCompany: candidate.currentCompany ?? current.currentCompany,
        linkedinUrl: candidate.linkedinUrl ?? current.linkedinUrl,
        portfolioUrl: candidate.portfolioUrl ?? current.portfolioUrl,
        experienceYears: candidate.experienceYears ?? current.experienceYears,
        skills: candidate.skills ?? current.skills,
        strengths: candidate.strengths ?? current.strengths,
        weaknesses: candidate.weaknesses ?? current.weaknesses,
        source: candidate.source ?? file.name,
        notes: candidate.notes ?? current.notes,
        resumeText: candidate.resumeText ?? current.resumeText,
        resumeFileName: candidate.resumeFileName ?? file.name,
        resumeFileType: candidate.resumeFileType ?? file.type,
        resumeFileData: candidate.resumeFileData ?? current.resumeFileData,
      }));
      setParseStatus(
        payload.source === "ai"
          ? "AI filled the form from the resume. Review before saving."
          : "Resume text was read. Complete any missing fields before saving.",
      );
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Resume parsing failed.");
    } finally {
      setIsParsing(false);
    }
  }

  function updateDraft(field: keyof CandidateDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="bg-zinc-950 text-white hover:bg-zinc-800" />}>
        <Plus className="size-4" />
        Add New Candidate
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl p-6 sm:max-w-[760px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Add Candidate</DialogTitle>
          <DialogDescription className={parseError ? "text-red-600" : undefined}>
            {helperText}
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="grid gap-5">
          <input type="hidden" name="resumeText" value={draft.resumeText} />
          <input type="hidden" name="resumeFileName" value={draft.resumeFileName} />
          <input type="hidden" name="resumeFileType" value={draft.resumeFileType} />
          <input type="hidden" name="resumeFileData" value={draft.resumeFileData} />
          <input type="hidden" name="source" value={draft.source} />

          <div className="rounded-xl border border-zinc-200 p-4 shadow-sm">
            <Label htmlFor="resume-upload" className="mb-3 flex items-center gap-2 text-base">
              {isParsing ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Upload Resume (optional)
            </Label>
            <Input
              id="resume-upload"
              type="file"
              accept=".txt,.md,.pdf,.doc,.docx,.rtf"
              disabled={isParsing || isSaving}
              onChange={(event) => handleResumeUpload(event.target.files?.[0])}
              className="h-11 bg-white"
            />
          </div>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <CandidateField
              label="Name *"
              name="name"
              value={draft.name}
              onChange={(value) => updateDraft("name", value)}
              required
            />
            <CandidateField
              label="Email *"
              name="email"
              type="email"
              value={draft.email}
              onChange={(value) => updateDraft("email", value)}
              required
            />
            <CandidateField
              label="Phone"
              name="phone"
              value={draft.phone}
              onChange={(value) => updateDraft("phone", value)}
            />
            <CandidateField
              label="Location"
              name="location"
              value={draft.location}
              onChange={(value) => updateDraft("location", value)}
            />
            <CandidateField
              label="Current Title"
              name="currentTitle"
              value={draft.currentTitle}
              onChange={(value) => updateDraft("currentTitle", value)}
            />
            <CandidateField
              label="Current Company"
              name="currentCompany"
              value={draft.currentCompany}
              onChange={(value) => updateDraft("currentCompany", value)}
            />
            <CandidateField
              label="LinkedIn URL"
              name="linkedinUrl"
              value={draft.linkedinUrl}
              onChange={(value) => updateDraft("linkedinUrl", value)}
            />
            <CandidateField
              label="Portfolio URL"
              name="portfolioUrl"
              value={draft.portfolioUrl}
              onChange={(value) => updateDraft("portfolioUrl", value)}
            />
            <CandidateField
              label="Experience (years)"
              name="experienceYears"
              type="number"
              min="0"
              value={draft.experienceYears}
              onChange={(value) => updateDraft("experienceYears", value)}
            />
            <CandidateField
              label="Skills (comma separated)"
              name="skills"
              value={draft.skills}
              onChange={(value) => updateDraft("skills", value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="candidate-notes" className="text-base">
              AI Summary
            </Label>
            <Textarea
              id="candidate-notes"
              name="notes"
              value={draft.notes}
              onChange={(event) => updateDraft("notes", event.target.value)}
              className="min-h-24"
            />
          </div>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <CandidateField
              label="Strengths (comma separated)"
              name="strengths"
              value={draft.strengths}
              onChange={(value) => updateDraft("strengths", value)}
            />
            <CandidateField
              label="Weaknesses (comma separated)"
              name="weaknesses"
              value={draft.weaknesses}
              onChange={(value) => updateDraft("weaknesses", value)}
            />
          </div>

          {state.message && !state.ok ? (
            <p className="text-sm text-red-600">{state.message}</p>
          ) : null}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isParsing}>
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Save Candidate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function parseResumeUploadResponse(text: string): {
  candidate?: ParsedCandidate;
  error?: string;
  source?: "ai" | "fallback";
} {
  if (!text.trim()) {
    return { error: "Resume upload failed. The server returned an empty response." };
  }

  try {
    return JSON.parse(text) as {
      candidate?: ParsedCandidate;
      error?: string;
      source?: "ai" | "fallback";
    };
  } catch {
    return {
      error: "Resume upload failed. Try another file or fill the form manually.",
    };
  }
}

function CandidateField({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  min,
}: {
  label: string;
  name: keyof CandidateDraft;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  min?: string;
}) {
  const id = `candidate-${name}`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        className="h-11 bg-white"
      />
    </div>
  );
}
