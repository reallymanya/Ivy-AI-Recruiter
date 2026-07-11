"use client";

import { useTransition } from "react";
import { Check, LoaderCircle, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { updateJobStatusById } from "./actions";

type JobStatus = "draft" | "active" | "closed" | "paused";

const statusOptions: JobStatus[] = ["draft", "active", "closed"];

export function JobStatusMenu({
  jobId,
  currentStatus,
}: {
  jobId: string;
  currentStatus: JobStatus;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
            aria-label="Change job status"
          />
        }
      >
        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <div className="px-1.5 py-1 text-xs font-medium text-zinc-500">Status</div>
        <DropdownMenuSeparator />
        {statusOptions.map((status) => (
          <DropdownMenuItem
            key={status}
            render={<div />}
            className="justify-between"
            onClick={() => {
              startTransition(() => {
                void updateJobStatusById(jobId, status);
              });
            }}
          >
            <span
              className={`size-2 rounded-full ${getJobStatusDotClassName(status)}`}
              aria-hidden="true"
            />
            {formatJobStatus(status)}
            {status === currentStatus ? <Check className="size-4 text-zinc-500" /> : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatJobStatus(status: JobStatus) {
  if (status === "closed") {
    return "Expired";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getJobStatusDotClassName(status: JobStatus) {
  if (status === "active") {
    return "bg-emerald-500";
  }

  if (status === "closed") {
    return "bg-rose-500";
  }

  return "bg-amber-500";
}
