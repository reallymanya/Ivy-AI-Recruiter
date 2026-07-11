"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function InterviewStartForm({
  interviewId,
  interviewType = "screening",
}: {
  interviewId: string;
  interviewType?: "screening" | "technical" | "hr_final";
}) {
  const router = useRouter();
  const [candidateName, setCandidateName] = useState("");

  function startInterview() {
    const name = candidateName.trim();

    if (!name) {
      return;
    }

    const params = new URLSearchParams({ name, type: interviewType });
    router.push(`/interview/${encodeURIComponent(interviewId)}/room?${params.toString()}`);
  }

  return (
    <Card className="lg:sticky lg:top-8">
      <CardHeader>
        <CardDescription>Ready to begin?</CardDescription>
        <CardTitle>Enter your full name</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            startInterview();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="candidate-name">Full name</Label>
            <Input
              id="candidate-name"
              name="candidateName"
              value={candidateName}
              onChange={(event) => setCandidateName(event.target.value)}
              placeholder="e.g. Priya Sharma"
              autoComplete="name"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={!candidateName.trim()}>
            Start interview
          </Button>
          <p className="text-xs leading-5 text-zinc-500">
            You will be taken to a secure interview room where Ivy will ask role-specific screening
            questions.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
