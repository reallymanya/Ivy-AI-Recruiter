import { desc, eq } from "drizzle-orm";
import {
  ArrowRight,
  Briefcase,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronsUpDown,
  Crown,
  Home,
  MailCheck,
  PanelTop,
  Settings,
  SlidersHorizontal,
  UserRound,
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
import { candidates, interviewSessions, jobs } from "@/lib/db/schema";
import { getSettingsForUser } from "@/lib/interview/agent-settings";
import { ProfileAccountMenuItem } from "./profile-account-menu-item";

export default async function DashboardPage() {
  const [syncedUser, jobRows, candidateRows, sessionRows, recentCompleted] = await Promise.all([
    getDashboardUser(),
    db.select().from(jobs).orderBy(desc(jobs.createdAt)),
    db.select({ id: candidates.id }).from(candidates),
    db.select({
      id: interviewSessions.id,
      jobId: interviewSessions.jobId,
      status: interviewSessions.status,
      invitedAt: interviewSessions.invitedAt,
      overallScore: interviewSessions.overallScore,
    }).from(interviewSessions),
    db.select({
      id: interviewSessions.id,
      candidateId: candidates.id,
      candidateName: candidates.name,
      jobTitle: jobs.title,
      interviewType: interviewSessions.interviewType,
      overallScore: interviewSessions.overallScore,
      recommendation: interviewSessions.recommendation,
      completedAt: interviewSessions.completedAt,
    })
      .from(interviewSessions)
      .innerJoin(candidates, eq(candidates.id, interviewSessions.candidateId))
      .innerJoin(jobs, eq(jobs.id, interviewSessions.jobId))
      .where(eq(interviewSessions.status, "completed"))
      .orderBy(desc(interviewSessions.completedAt))
      .limit(5),
  ]);
  const settings = await getSettingsForUser(syncedUser.id);
  const displayName =
    [syncedUser.firstName, syncedUser.lastName].filter(Boolean).join(" ") ||
    syncedUser.email ||
    "Recruiter";
  const initials = getInitials(displayName);
  const email = syncedUser.email ?? "recruiter@ivy.ai";
  const activeJobs = jobRows.filter((job) => job.status === "active");
  const invitedSessions = sessionRows.filter((session) => session.invitedAt);
  const pendingSessions = sessionRows.filter(
    (session) => session.invitedAt && ["scheduled", "in_progress", "needs_review"].includes(session.status),
  );
  const completedSessions = sessionRows.filter((session) => session.status === "completed");
  const scoredSessions = completedSessions.filter((session) => session.overallScore !== null);
  const averageScore = scoredSessions.length
    ? Math.round(scoredSessions.reduce((sum, session) => sum + (session.overallScore ?? 0), 0) / scoredSessions.length)
    : null;
  const jobActivity = activeJobs.slice(0, 5).map((job) => {
    const sessions = sessionRows.filter((session) => session.jobId === job.id);
    return {
      ...job,
      invited: sessions.filter((session) => session.invitedAt).length,
      completed: sessions.filter((session) => session.status === "completed").length,
    };
  });

  const sidebarItems = [
    { title: "Home", href: "/dashboard", icon: Home, isActive: true },
    { title: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
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
                      render={<Link href={item.href} />}
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
              <p className="text-sm font-medium">Dashboard</p>
              <p className="hidden text-xs text-zinc-500 sm:block">Welcome back, {displayName}.</p>
            </div>
          </div>
          <Button variant="outline" size="icon" aria-label="Portfolio">
            <BriefcaseBusiness className="size-4" />
          </Button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <section className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Badge variant="secondary" className="mb-3 rounded-full">
                Recruiter dashboard
              </Badge>
              <h1 className="text-3xl font-semibold tracking-tight">
                Welcome back, {displayName}.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                Here&apos;s what needs attention across your roles, candidates, and AI interviews.
              </p>
            </div>
            <Button nativeButton={false} render={<Link href="/dashboard/jobs" />}>
              Manage jobs
              <ArrowRight className="size-4" />
            </Button>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Active roles" value={activeJobs.length} detail={`${jobRows.length} total jobs`} icon={Briefcase} href="/dashboard/jobs" />
            <MetricCard title="Candidates" value={candidateRows.length} detail="Profiles in your talent pool" icon={UsersRound} href="/dashboard/candidates" />
            <MetricCard title="Pending interviews" value={pendingSessions.length} detail={`${invitedSessions.length} invitations sent`} icon={MailCheck} href="/dashboard/interviews" />
            <MetricCard title="Completed" value={completedSessions.length} detail={averageScore === null ? "No scored interviews yet" : `${averageScore}% average score`} icon={CheckCircle2} href="/dashboard/interviews" />
          </section>

          <section className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
            <Card className="border-zinc-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-zinc-100">
                <div><CardTitle className="text-base">Recent interview results</CardTitle><CardDescription className="mt-1">Latest completed AI interviews</CardDescription></div>
                <Button nativeButton={false} variant="ghost" size="sm" render={<Link href="/dashboard/interviews" />}>View all</Button>
              </CardHeader>
              <CardContent className="p-0">
                {recentCompleted.length ? (
                  <div className="divide-y divide-zinc-100">
                    {recentCompleted.map((interview) => (
                      <Link key={interview.id} href={`/dashboard/interviews/${interview.id}`} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-zinc-50">
                        <Avatar className="size-9"><AvatarFallback>{getInitials(interview.candidateName)}</AvatarFallback></Avatar>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{interview.candidateName}</p><p className="mt-0.5 truncate text-xs text-zinc-500">{interview.jobTitle} · {formatInterviewType(interview.interviewType)}</p></div>
                        <div className="text-right"><p className="text-sm font-semibold tabular-nums">{interview.overallScore === null ? "Pending" : `${interview.overallScore}%`}</p><p className="mt-0.5 text-xs text-zinc-500">{interview.completedAt ? formatDate(interview.completedAt, settings.timezone) : "Completed"}</p></div>
                        <ArrowRight className="size-4 shrink-0 text-zinc-400" />
                      </Link>
                    ))}
                  </div>
                ) : <EmptyDashboardState text="Completed interview results will appear here." href="/dashboard/interviews" action="Open interviews" />}
              </CardContent>
            </Card>

            <div className="grid gap-5">
              <Card className="border-zinc-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between gap-4"><div><CardTitle className="text-base">Active job pipeline</CardTitle><CardDescription className="mt-1">Invitation and completion progress</CardDescription></div><Briefcase className="size-5 text-zinc-400" /></CardHeader>
                <CardContent className="grid gap-3">
                  {jobActivity.length ? jobActivity.map((job) => (
                    <Link key={job.id} href="/dashboard/interviews" className="grid gap-2 rounded-md border border-zinc-200 p-3 hover:bg-zinc-50">
                      <div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-medium">{job.title}</p><ArrowRight className="size-4 shrink-0 text-zinc-400" /></div>
                      <div className="flex gap-4 text-xs text-zinc-500"><span>{job.invited} invited</span><span>{job.completed} completed</span></div>
                    </Link>
                  )) : <p className="py-8 text-center text-sm text-zinc-500">No active jobs yet.</p>}
                </CardContent>
              </Card>

              <Card className="border-zinc-200 shadow-sm">
                <CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-3">
                  <Button nativeButton={false} variant="outline" render={<Link href="/dashboard/jobs" />}><Briefcase className="size-4" />Add job</Button>
                  <Button nativeButton={false} variant="outline" render={<Link href="/dashboard/candidates" />}><UserRound className="size-4" />Add candidate</Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function MetricCard({
  title,
  value,
  detail,
  icon: Icon,
  href,
}: {
  title: string;
  value: number;
  detail: string;
  icon: typeof Briefcase;
  href: string;
}) {
  return (
    <Link href={href} className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950">
      <Card className="h-full border-zinc-200 shadow-sm transition-colors group-hover:border-zinc-300">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div><CardDescription>{title}</CardDescription><CardTitle className="mt-2 text-3xl tabular-nums">{value}</CardTitle></div>
          <span className="flex size-9 items-center justify-center rounded-md bg-zinc-100 text-zinc-600"><Icon className="size-4" /></span>
        </CardHeader>
        <CardContent><p className="text-sm text-zinc-500">{detail}</p></CardContent>
      </Card>
    </Link>
  );
}

function EmptyDashboardState({ text, href, action }: { text: string; href: string; action: string }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center px-5 text-center">
      <CalendarClock className="size-8 text-zinc-300" />
      <p className="mt-3 text-sm text-zinc-500">{text}</p>
      <Button nativeButton={false} variant="outline" size="sm" className="mt-4" render={<Link href={href} />}>{action}</Button>
    </div>
  );
}

function formatInterviewType(value: string | null) {
  if (value === "technical") return "Technical";
  if (value === "hr_final") return "HR Final";
  if (value === "screening") return "Screening";
  return "Interview";
}

function formatDate(value: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: timezone,
  }).format(value);
}

function isDefaultClerkImage(value: string) {
  return value.includes("img.clerk.com") && value.includes("default");
}
