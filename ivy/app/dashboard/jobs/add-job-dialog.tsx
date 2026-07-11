"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Plus, Sparkles } from "lucide-react";

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

import { createJob, type JobFormState } from "./actions";

type JobDraft = {
  title: string;
  department: string;
  employmentType: string;
  level: string;
  location: string;
  minSalary: string;
  maxSalary: string;
  currency: string;
  status: "draft" | "active" | "closed";
  description: string;
  responsibilities: string;
  requirements: string;
  rubric: string;
};

type GeneratedJob = Partial<Omit<JobDraft, "status">>;

const baseDraft: JobDraft = {
  title: "",
  department: "",
  employmentType: "Full-time",
  level: "Mid",
  location: "",
  minSalary: "",
  maxSalary: "",
  currency: "USD",
  status: "draft",
  description: "",
  responsibilities: "",
  requirements: "",
  rubric: "",
};

const initialState: JobFormState = {
  ok: false,
  message: "",
};

export function AddJobDialog({
  defaults,
}: {
  defaults: { location: string; currency: string; employmentType: string };
}) {
  const initialDraft = useMemo(
    () => ({
      ...baseDraft,
      location: defaults.location,
      currency: defaults.currency,
      employmentType: defaults.employmentType,
    }),
    [defaults.currency, defaults.employmentType, defaults.location],
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<JobDraft>(initialDraft);
  const [generateStatus, setGenerateStatus] = useState("");
  const [generateError, setGenerateError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [state, formAction, isSaving] = useActionState(createJob, initialState);

  useEffect(() => {
    if (!state.ok) {
      return;
    }

    queueMicrotask(() => {
      setDraft(initialDraft);
      formRef.current?.reset();
      setGenerateStatus("");
      setGenerateError("");
      setOpen(false);
    });
  }, [initialDraft, state.ok]);

  const helperText = useMemo(() => {
    if (generateError) {
      return generateError;
    }

    if (generateStatus) {
      return generateStatus;
    }

    return "Use AI to auto-fill details or enter them manually.";
  }, [generateError, generateStatus]);

  async function generateWithAi() {
    setGenerateError("");
    setGenerateStatus("");

    if (!draft.title.trim()) {
      setGenerateError("Enter a job title before using AI.");
      return;
    }

    setIsGenerating(true);
    setGenerateStatus("Generating job details...");

    try {
      const response = await fetch("/api/jobs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: draft.title }),
      });
      const payload = await readJsonResponse<{
        job?: GeneratedJob;
        error?: string;
        source?: "ai" | "fallback";
      }>(response);

      if (!response.ok) {
        throw new Error(payload.error || "Job generation failed.");
      }

      const job = payload.job ?? {};

      setDraft((current) => ({
        ...current,
        title: job.title ?? current.title,
        department: job.department ?? current.department,
        employmentType: job.employmentType ?? current.employmentType,
        level: job.level ?? current.level,
        location: job.location ?? current.location,
        minSalary: job.minSalary ?? current.minSalary,
        maxSalary: job.maxSalary ?? current.maxSalary,
        currency: job.currency ?? current.currency,
        description: job.description ?? current.description,
        responsibilities: job.responsibilities ?? current.responsibilities,
        requirements: job.requirements ?? current.requirements,
        rubric: job.rubric ?? current.rubric,
      }));
      setGenerateStatus(
        payload.source === "ai"
          ? "AI filled the job details. Review before saving."
          : "A starter draft was created. Review before saving.",
      );
    } catch (error) {
      setGenerateError(error instanceof Error ? error.message : "Job generation failed.");
    } finally {
      setIsGenerating(false);
    }
  }

  function updateDraft<Key extends keyof JobDraft>(field: Key, value: JobDraft[Key]) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="lg" className="bg-zinc-950 text-white hover:bg-zinc-800" />}>
        <Plus className="size-4" />
        Add New Job
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-xl p-6 sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">Add New Job</DialogTitle>
          <DialogDescription className={generateError ? "text-red-600" : undefined}>
            {helperText}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-dashed border-zinc-300 p-4">
          <Label htmlFor="ai-title" className="mb-3 flex items-center gap-2 text-base">
            <Sparkles className="size-4 text-zinc-700" />
            Auto-fill with AI
          </Label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <Input
              id="ai-title"
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              placeholder="Enter Job Title (e.g. Senior React Engineer)"
              className="h-11 bg-white"
            />
            <Button
              type="button"
              className="h-11 bg-zinc-950 text-white hover:bg-zinc-800"
              disabled={isGenerating || isSaving}
              onClick={generateWithAi}
            >
              {isGenerating ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {isGenerating ? "Generating..." : "Generate"}
            </Button>
          </div>
        </div>

        <form ref={formRef} action={formAction} className="grid gap-5 border-t border-zinc-100 pt-5">
          <h3 className="text-base font-semibold">Job Details</h3>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <JobField
              label="Job Title"
              name="title"
              value={draft.title}
              onChange={(value) => updateDraft("title", value)}
              placeholder="e.g. Senior React Developer"
              required
            />
            <JobField
              label="Department"
              name="department"
              value={draft.department}
              onChange={(value) => updateDraft("department", value)}
              placeholder="e.g. Engineering"
            />
          </div>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-3">
            <JobSelect
              label="Type"
              name="employmentType"
              value={draft.employmentType}
              onChange={(value) => updateDraft("employmentType", value)}
              options={["Full-time", "Part-time", "Contract", "Internship"]}
            />
            <JobSelect
              label="Level"
              name="level"
              value={draft.level}
              onChange={(value) => updateDraft("level", value)}
              options={["Junior", "Mid", "Senior", "Lead", "Principal"]}
            />
            <JobField
              label="Location"
              name="location"
              value={draft.location}
              onChange={(value) => updateDraft("location", value)}
              placeholder="e.g. New York / Remote"
            />
          </div>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-3">
            <JobField
              label="Min Salary"
              name="minSalary"
              type="number"
              value={draft.minSalary}
              onChange={(value) => updateDraft("minSalary", value)}
              placeholder="80000"
            />
            <JobField
              label="Max Salary"
              name="maxSalary"
              type="number"
              value={draft.maxSalary}
              onChange={(value) => updateDraft("maxSalary", value)}
              placeholder="120000"
            />
            <JobField
              label="Currency"
              name="currency"
              value={draft.currency}
              onChange={(value) => updateDraft("currency", value)}
              placeholder="USD"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="job-description" className="text-base">
              Description
            </Label>
            <Textarea
              id="job-description"
              name="description"
              value={draft.description}
              onChange={(event) => updateDraft("description", event.target.value)}
              placeholder="Job overview..."
              className="min-h-32"
            />
          </div>

          <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="job-responsibilities" className="text-base">
                Responsibilities
              </Label>
              <Textarea
                id="job-responsibilities"
                name="responsibilities"
                value={draft.responsibilities}
                onChange={(event) => updateDraft("responsibilities", event.target.value)}
                placeholder="Key responsibilities..."
                className="min-h-36"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="job-requirements" className="text-base">
                Requirements
              </Label>
              <Textarea
                id="job-requirements"
                name="requirements"
                value={draft.requirements}
                onChange={(event) => updateDraft("requirements", event.target.value)}
                placeholder="Key requirements..."
                className="min-h-36"
              />
            </div>
          </div>

          <input type="hidden" name="status" value={draft.status} />
          <input type="hidden" name="rubric" value={draft.rubric} />

          {state.message && !state.ok ? (
            <p className="text-sm text-red-600">{state.message}</p>
          ) : null}

          <DialogFooter className="mt-1">
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving || isGenerating}>
              {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : null}
              Save Job
            </Button>
          </DialogFooter>
        </form>
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

function JobField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
}: {
  label: string;
  name: keyof JobDraft;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  const id = `job-${name}`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        className="h-11 bg-white"
      />
    </div>
  );
}

function JobSelect({
  label,
  name,
  value,
  onChange,
  options,
}: {
  label: string;
  name: keyof JobDraft;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const id = `job-${name}`;

  return (
    <div className="grid gap-2">
      <Label htmlFor={id} className="text-base">
        {label}
      </Label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-lg border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
