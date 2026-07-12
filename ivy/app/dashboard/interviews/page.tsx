import { desc, eq } from "drizzle-orm";
import {
  Briefcase,
  BriefcaseBusiness,
  CalendarClock,
  ChevronsUpDown,
  Crown,
  Home,
  PanelTop,
  Settings,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { interviewSessions, jobs } from "@/lib/db/schema";
import { getSettingsForUser } from "@/lib/interview/agent-settings";

import { InterviewsWorkspace, type InterviewWorkspaceSession } from "./interviews-workspace";
import { ProfileAccountMenuItem } from "../profile-account-menu-item";

export default async function InterviewsPage() {
  const syncedUser = await getDashboardUser();
  const [jobRows, sessionRows] = await Promise.all([
    db.select().from(jobs).where(eq(jobs.recruiterId, syncedUser.id)).orderBy(desc(jobs.createdAt)),
    db.query.interviewSessions.findMany({
      where: eq(interviewSessions.recruiterId, syncedUser.id),
      with: { candidate: true },
      orderBy: (table, { desc: descending }) => [descending(table.updatedAt)],
    }),
  ]);

  const displayName =
    [syncedUser.firstName, syncedUser.lastName].filter(Boolean).join(" ") ||
    syncedUser.email ||
    "Recruiter";
  const initials = getInitials(displayName);
  const email = syncedUser.email ?? "recruiter@ivy.ai";
  const recruiterSettings = await getSettingsForUser(syncedUser.id);
  const activeJobs = jobRows.filter((job) => job.status === "active");
  const visibleJobs = jobRows;
  const recentSession = sessionRows.find(
    (session) => session.invitedAt || session.status === "completed",
  );
  const defaultJobId =
    (recentSession && visibleJobs.some((job) => job.id === recentSession.jobId)
      ? recentSession.jobId
      : activeJobs[0]?.id ?? visibleJobs[0]?.id) ?? "";

  const sessions: InterviewWorkspaceSession[] = sessionRows.map((session) => ({
    id: session.id,
    jobId: session.jobId,
    candidateId: session.candidateId,
    candidateName: session.candidate.name,
    candidateEmail: session.candidate.email,
    candidateTitle: session.candidate.currentTitle,
    interviewType: session.interviewType,
    status: session.status,
    invitedAt: session.invitedAt?.toISOString() ?? null,
    startedAt: session.startedAt?.toISOString() ?? null,
    completedAt: session.completedAt?.toISOString() ?? null,
    overallScore: session.overallScore,
    recommendation: session.recommendation,
  }));

  const sidebarItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
    { title: "Candidate", href: "/dashboard/candidates", icon: UsersRound },
    {
      title: "Schedules / Interview",
      href: "/dashboard/interviews",
      icon: CalendarClock,
      isActive: true,
    },
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
                  <div className="px-1.5 py-1 text-xs font-medium text-zinc-500">Profile settings</div>
                  <DropdownMenuSeparator />
                  <ProfileAccountMenuItem />
                  <DropdownMenuItem render={<Link href="/dashboard/settings#preferences" />}><SlidersHorizontal className="size-4" />Preferences</DropdownMenuItem>
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
              <p className="text-sm font-medium">Schedules / Interview</p>
              <p className="hidden text-xs text-zinc-500 sm:block">Track invites and completed results by job.</p>
            </div>
          </div>
          <Button variant="outline" size="icon" aria-label="Portfolio">
            <BriefcaseBusiness className="size-4" />
          </Button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <section className="mb-6">
            <h1 className="text-2xl font-semibold">Interviews</h1>
            <p className="mt-1 text-sm text-zinc-600">
              Review candidate progress and results for each open role.
            </p>
          </section>
          <InterviewsWorkspace
            jobs={visibleJobs.map((job) => ({ id: job.id, title: job.title }))}
            sessions={sessions}
            defaultJobId={defaultJobId}
            timezone={recruiterSettings.timezone}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function getInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function isDefaultClerkImage(value: string) {
  return value.includes("img.clerk.com") && value.includes("default");
}
