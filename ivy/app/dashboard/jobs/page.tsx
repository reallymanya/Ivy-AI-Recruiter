import { desc, eq } from "drizzle-orm";
import {
  Briefcase,
  BriefcaseBusiness,
  CalendarClock,
  ChevronsUpDown,
  Crown,
  Home,
  Layers,
  MapPin,
  PanelTop,
  Settings,
  SlidersHorizontal,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getDashboardUser } from "@/lib/auth/dashboard-user";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { getSettingsForUser } from "@/lib/interview/agent-settings";

import { deleteJob } from "./actions";
import { AddJobDialog } from "./add-job-dialog";
import { JobStatusMenu } from "./job-status-menu";
import { MatchingCandidatesDialog } from "./matching-candidates-dialog";
import { ProfileAccountMenuItem } from "../profile-account-menu-item";

type JobRow = typeof jobs.$inferSelect;

export default async function JobsPage() {
  const syncedUser = await getDashboardUser();
  const jobRows = await db.select().from(jobs)
    .where(eq(jobs.recruiterId, syncedUser.id)).orderBy(desc(jobs.createdAt));
  const recruiterSettings = await getSettingsForUser(syncedUser.id);
  const jobDefaults = {
    location: recruiterSettings.defaultJobLocation,
    currency: recruiterSettings.defaultJobCurrency,
    employmentType: recruiterSettings.defaultEmploymentType,
  };

  const displayName =
    [syncedUser.firstName, syncedUser.lastName].filter(Boolean).join(" ") ||
    syncedUser.email ||
    "Recruiter";
  const initials = getInitials(displayName);
  const email = syncedUser.email ?? "recruiter@ivy.ai";

  const sidebarItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "Jobs", href: "/dashboard/jobs", icon: Briefcase, isActive: true },
    { title: "Candidate", href: "/dashboard/candidates", icon: UsersRound },
    { title: "Schedules / Interview", href: "/dashboard/interviews", icon: CalendarClock },
    { title: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <SidebarProvider style={{ "--sidebar-width-icon": "4rem" } as CSSProperties}>
      <Sidebar collapsible="icon" className="border-zinc-200">
        <SidebarHeader className="h-16 justify-center border-b border-zinc-200 px-3 py-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                className="gap-3 data-[active=true]:bg-transparent group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0"
                render={<Link href="/dashboard" />}
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-white">
                  <PanelTop className="!size-5" />
                </span>
                <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
                  <span className="truncate text-sm font-semibold">Ivy Recruiter</span>
                  <span className="truncate text-xs text-zinc-500">AI hiring workspace</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {sidebarItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      size="lg"
                      tooltip={item.title}
                      isActive={item.isActive}
                      className="gap-3 text-base group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0"
                      render={item.href === "/dashboard" ? <a href="/dashboard" /> : <Link href={item.href} />}
                    >
                      <item.icon className="!size-5" />
                      <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="mt-auto w-full border-t border-zinc-200 p-3 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:p-2">
          <SidebarMenu className="gap-2 group-data-[collapsible=icon]:items-center">
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip="Upgrade the plan"
                className="justify-center gap-3 bg-zinc-950 text-white hover:bg-zinc-800 hover:text-white group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0"
              >
                <Crown className="!size-5" />
                <span className="group-data-[collapsible=icon]:hidden">Upgrade the plan</span>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <SidebarMenuButton
                      size="lg"
                      className="gap-3 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0"
                    >
                      <Avatar className="size-9 group-data-[collapsible=icon]:size-10">
                        {syncedUser.imageUrl && !isDefaultClerkImage(syncedUser.imageUrl) ? (
                          <AvatarImage src={syncedUser.imageUrl} alt={displayName} />
                        ) : null}
                        <AvatarFallback className="bg-zinc-950 text-white">{initials}</AvatarFallback>
                      </Avatar>
                      <span className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-medium">{displayName}</span>
                        <span className="truncate text-xs text-zinc-500">{email}</span>
                      </span>
                      <ChevronsUpDown className="ml-auto size-4 text-zinc-500 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  }
                />
                <DropdownMenuContent side="right" align="end" className="w-56">
                  <div className="px-1.5 py-1 text-xs font-medium text-zinc-500">
                    Profile settings
                  </div>
                  <DropdownMenuSeparator />
                  <ProfileAccountMenuItem />
                  <DropdownMenuItem render={<Link href="/dashboard/settings#preferences" />}>
                    <SlidersHorizontal className="size-4" />
                    Preferences
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-screen bg-zinc-50 text-zinc-950">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-zinc-200 bg-zinc-50/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <SidebarTrigger />
            <div>
              <p className="text-sm font-medium">Jobs</p>
              <p className="hidden text-xs text-zinc-500 sm:block">
                Create postings and match candidates.
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" aria-label="Portfolio">
            <BriefcaseBusiness className="size-4" />
          </Button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <section className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Jobs</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Add job postings, manage status, and find matching candidates with AI.
              </p>
            </div>
            <AddJobDialog defaults={jobDefaults} />
          </section>

          {jobRows.length === 0 ? (
            <Empty className="min-h-[280px] bg-transparent">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <Briefcase className="size-5" />
                </EmptyMedia>
                <EmptyTitle>No jobs yet</EmptyTitle>
                <EmptyDescription>
                  Add the first job posting to start matching candidates.
                </EmptyDescription>
              </EmptyHeader>
              <AddJobDialog defaults={jobDefaults} />
            </Empty>
          ) : (
            <section className="grid auto-rows-fr gap-4 lg:grid-cols-2">
              {jobRows.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </section>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function JobCard({ job }: { job: JobRow }) {
  const criteria = job.rubric?.criteria ?? [];

  const salary = formatSalary(job);

  return (
    <Card className="flex h-full overflow-hidden border-zinc-200 bg-white shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle className="truncate text-xl">{job.title}</CardTitle>
              <Badge variant="secondary" className={getJobStatusClassName(job.status)}>
                {formatJobStatus(job.status)}
              </Badge>
            </div>
            <CardDescription className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              {job.department ? <span>{job.department}</span> : null}
              {job.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {job.location}
                </span>
              ) : null}
            </CardDescription>
          </div>
          <JobStatusMenu jobId={job.id} currentStatus={job.status} />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="grid min-h-12 gap-2 text-sm text-zinc-600 sm:grid-cols-3">
          {job.employmentType ? (
            <span className="inline-flex items-center gap-2">
              <Briefcase className="size-4" />
              {job.employmentType}
            </span>
          ) : null}
          {job.level ? (
            <span className="inline-flex items-center gap-2">
              <Layers className="size-4" />
              {job.level}
            </span>
          ) : null}
          {salary ? (
            <span className="inline-flex min-w-0 items-center gap-2">
              <span className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{salary}</span>
            </span>
          ) : null}
        </div>

        {job.description ? (
          <p className="line-clamp-4 min-h-24 text-sm leading-6 text-zinc-600">
            {job.description}
          </p>
        ) : (
          <p className="min-h-24 text-sm leading-6 text-zinc-500">No description yet.</p>
        )}

        <div className="min-h-8">
          {criteria.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {criteria.slice(0, 5).map((criterion) => (
                <Badge key={criterion.name} variant="secondary" className="rounded-full">
                  {criterion.name}
                </Badge>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex justify-end border-t border-zinc-100 pt-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <MatchingCandidatesDialog jobId={job.id} jobTitle={job.title} />
            <form action={deleteJob}>
              <input type="hidden" name="jobId" value={job.id} />
              <Button
                type="submit"
                variant="ghost"
                size="icon-sm"
                className="text-zinc-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Delete job"
              >
                <Trash2 className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getJobStatusClassName(status: JobRow["status"]) {
  const baseClassName = "shrink-0 rounded-full border";

  if (status === "active") {
    return `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-700`;
  }

  if (status === "closed") {
    return `${baseClassName} border-rose-200 bg-rose-50 text-rose-700`;
  }

  return `${baseClassName} border-amber-200 bg-amber-50 text-amber-700`;
}

function formatJobStatus(status: JobRow["status"]) {
  if (status === "closed") {
    return "Expired";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatSalary(job: JobRow) {
  if (!job.minSalary && !job.maxSalary) {
    return "";
  }

  if (job.minSalary && job.maxSalary) {
    return `${formatCurrencyAmount(job.minSalary, job.currency)} - ${formatCurrencyAmount(
      job.maxSalary,
      job.currency,
    )}`;
  }

  return formatCurrencyAmount(job.minSalary ?? job.maxSalary ?? 0, job.currency);
}

function formatCurrencyAmount(amount: number, currencyCode: string | null) {
  const currency = currencyCode || "USD";

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(
      amount,
    )}`;
  }
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isDefaultClerkImage(value: string) {
  return value.includes("img.clerk.com") && value.includes("default");
}
