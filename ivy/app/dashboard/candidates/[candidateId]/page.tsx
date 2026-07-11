import { and, desc, eq } from "drizzle-orm";
import {
  ArrowLeft,
  Briefcase,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  ChevronsUpDown,
  Crown,
  Download,
  ExternalLink,
  FileText,
  Globe,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  PanelTop,
  Phone,
  Settings,
  SlidersHorizontal,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ProfileAccountMenuItem } from "../../profile-account-menu-item";

type CandidateProfilePageProps = {
  params: Promise<{
    candidateId: string;
  }>;
};

export default async function CandidateProfilePage({ params }: CandidateProfilePageProps) {
  const { candidateId } = await params;

  const [syncedUser, candidate, latestCompletedInterview] = await Promise.all([
    getDashboardUser(),
    db.query.candidates.findFirst({
      where: eq(candidates.id, candidateId),
    }),
    db
      .select({
        id: interviewSessions.id,
        jobTitle: jobs.title,
        overallScore: interviewSessions.overallScore,
        recommendation: interviewSessions.recommendation,
      })
      .from(interviewSessions)
      .innerJoin(jobs, eq(jobs.id, interviewSessions.jobId))
      .where(
        and(
          eq(interviewSessions.candidateId, candidateId),
          eq(interviewSessions.status, "completed"),
        ),
      )
      .orderBy(desc(interviewSessions.completedAt))
      .limit(1)
      .then((rows) => rows[0]),
  ]);

  if (!candidate) {
    notFound();
  }

  const displayName =
    [syncedUser.firstName, syncedUser.lastName].filter(Boolean).join(" ") ||
    syncedUser.email ||
    "Recruiter";
  const initials = getInitials(displayName);
  const email = syncedUser.email ?? "recruiter@ivy.ai";
  const candidateInitials = getInitials(candidate.name);
  const linkedinHref = getLinkedInHref(candidate.linkedinUrl, candidate.portfolioUrl, candidate.resumeText);
  const portfolioHref = getPortfolioHref(candidate.portfolioUrl, candidate.resumeText);

  const sidebarItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
    { title: "Candidate", href: "/dashboard/candidates", icon: UsersRound, isActive: true },
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
              <p className="text-sm font-medium">Candidates</p>
              <p className="hidden text-xs text-zinc-500 sm:block">Candidate profile.</p>
            </div>
          </div>
          <Button variant="outline" size="icon" aria-label="Portfolio">
            <BriefcaseBusiness className="size-4" />
          </Button>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Button
            nativeButton={false}
            variant="ghost"
            className="mb-6 text-zinc-600"
            render={<Link href="/dashboard/candidates" />}
          >
            <ArrowLeft className="size-4" />
            Back to Candidates
          </Button>

          <section className="mb-6 flex items-start gap-4">
            <Avatar className="size-16 bg-zinc-950 text-white shadow-sm">
              <AvatarFallback className="bg-zinc-950 text-xl text-white">
                {candidateInitials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-semibold tracking-tight">{candidate.name}</h1>
              <p className="mt-1 text-base text-zinc-600">
                {formatRole(candidate.currentTitle, candidate.currentCompany)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700">
                  new
                </Badge>
                {candidate.experienceYears ? (
                  <Badge variant="secondary" className="rounded-full">
                    {candidate.experienceYears}+ years
                  </Badge>
                ) : null}
                {(candidate.skills ?? []).slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="secondary" className="rounded-full">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.6fr)]">
            <div className="grid gap-5">
              <ProfileCard title="Contact Info">
                <ContactItem icon={Mail} value={candidate.email} fallback="No email added" />
                <ContactItem icon={Phone} value={candidate.phone} fallback="No phone added" />
                <ContactItem icon={MapPin} value={candidate.location} fallback="No location added" />
                <ContactItem
                  icon={Building2}
                  value={candidate.currentCompany}
                  fallback="No company added"
                />
                {linkedinHref ? (
                  <ContactLink
                    icon={ExternalLink}
                    href={linkedinHref}
                    label="LinkedIn Profile"
                  />
                ) : null}
                {portfolioHref ? (
                  <ContactLink
                    icon={Globe}
                    href={portfolioHref}
                    label={getPortfolioLabel(portfolioHref)}
                  />
                ) : null}
              </ProfileCard>

              <ProfileCard title="Skills">
                {candidate.skills?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="rounded-full">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500">No skills added yet.</p>
                )}
              </ProfileCard>

              <ProfileCard title="Source">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-sm text-zinc-600">
                    <FileText className="size-4 text-zinc-500" />
                    {candidate.resumeFileName ||
                      (candidate.resumeText ? candidate.source || "Resume attached" : "Manual entry")}
                  </div>
                  {candidate.resumeFileData || candidate.resumeText ? (
                    <Button
                      nativeButton={false}
                      variant="outline"
                      className="w-full justify-start"
                      render={
                        <a href={`/api/candidates/${candidate.id}/resume`} download />
                      }
                    >
                      <Download className="size-4" />
                      {candidate.resumeFileData
                        ? "Download uploaded resume"
                        : "Download extracted resume"}
                    </Button>
                  ) : (
                    <p className="text-sm text-zinc-500">No resume document is attached.</p>
                  )}
                </div>
              </ProfileCard>
            </div>

            <div className="grid gap-5">
              <ProfileCard title="AI Resume Analysis">
                <p className="text-sm leading-6 text-zinc-700">
                  {candidate.notes ||
                    candidate.resumeText ||
                    "No resume analysis is available yet. Add notes or upload a resume to build this profile."}
                </p>

                <div className="grid gap-5 pt-3 md:grid-cols-2">
                  <InsightList
                    title="Strengths"
                    tone="green"
                    items={candidate.strengths ?? []}
                    fallback="No strengths captured yet."
                  />
                  <InsightList
                    title="Areas to Improve"
                    tone="amber"
                    items={candidate.weaknesses ?? []}
                    fallback="No improvement areas captured yet."
                  />
                </div>
              </ProfileCard>

              <Card className="min-h-[280px] border-zinc-200 bg-white shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                    <MessageCircle className="size-4" />
                    AI Interview Results
                  </CardTitle>
                </CardHeader>
                {latestCompletedInterview ? (
                  <CardContent className="grid gap-4">
                    <div className="flex flex-col gap-4 rounded-md border border-zinc-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{latestCompletedInterview.jobTitle}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {latestCompletedInterview.recommendation ? (
                            <Badge variant="secondary">
                              {formatResultLabel(latestCompletedInterview.recommendation)}
                            </Badge>
                          ) : null}
                          <span className="text-sm font-semibold tabular-nums">
                            {latestCompletedInterview.overallScore === null
                              ? "Result pending"
                              : `${latestCompletedInterview.overallScore}%`}
                          </span>
                        </div>
                      </div>
                      <Button
                        nativeButton={false}
                        render={<Link href={`/dashboard/interviews/${latestCompletedInterview.id}`} />}
                      >
                        View AI analysis
                        <ExternalLink className="size-4" />
                      </Button>
                    </div>
                  </CardContent>
                ) : (
                  <CardContent className="flex min-h-44 flex-col items-center justify-center text-center">
                    <span className="flex size-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
                      <MessageCircle className="size-5" />
                    </span>
                    <p className="mt-4 text-sm font-medium text-zinc-600">No interview completed yet</p>
                    <p className="mt-1 max-w-md text-sm text-zinc-500">
                      Interview results will appear here once the candidate completes their session.
                    </p>
                  </CardContent>
                )}
              </Card>
            </div>
          </section>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function formatResultLabel(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ProfileCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-zinc-200 bg-white shadow-sm">
      <CardHeader>
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">{children}</CardContent>
    </Card>
  );
}

function ContactItem({
  icon: Icon,
  value,
  fallback,
}: {
  icon: typeof Mail;
  value: string | null;
  fallback: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 text-sm text-zinc-700">
      <Icon className="size-4 shrink-0 text-zinc-500" />
      <span className={value ? "truncate" : "truncate text-zinc-500"}>{value || fallback}</span>
    </div>
  );
}

function ContactLink({
  icon: Icon,
  href,
  label,
}: {
  icon: typeof ExternalLink;
  href: string;
  label: string;
}) {
  const externalHref = getExternalHref(href);

  return (
    <a
      href={externalHref}
      target="_blank"
      rel="noreferrer"
      className="flex min-w-0 items-center gap-3 text-sm font-medium text-zinc-700 hover:text-zinc-950"
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{label}</span>
    </a>
  );
}

function getExternalHref(href: string) {
  const trimmedHref = href.trim().replace(/[),.;]+$/g, "");

  if (/^https?:\/\//i.test(trimmedHref) || /^mailto:/i.test(trimmedHref)) {
    return trimmedHref;
  }

  return `https://${trimmedHref}`;
}

function getLinkedInHref(
  value: string | null,
  portfolioValue: string | null,
  resumeText: string | null,
) {
  const candidateValue = value?.trim();
  const candidatePortfolioValue = portfolioValue?.trim();
  const resumeMatch = resumeText?.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub)\/[^\s),.;]+/i,
  )?.[0];
  const rawHref =
    candidateValue && looksLikeLinkedInValue(candidateValue)
      ? candidateValue
      : candidatePortfolioValue && looksLikeLinkedInValue(candidatePortfolioValue)
        ? candidatePortfolioValue
        : resumeMatch;

  if (!rawHref) {
    return "";
  }

  if (/^\/?in\//i.test(rawHref)) {
    return `https://www.linkedin.com/${rawHref.replace(/^\/+/, "")}`;
  }

  return getExternalHref(rawHref);
}

function getPortfolioHref(value: string | null, resumeText: string | null) {
  const candidateValue = value?.trim();
  const resumeUrls =
    resumeText?.match(/(?:https?:\/\/)?(?:www\.)?(?:github\.com|gitlab\.com|behance\.net|dribbble\.com|[a-z0-9.-]+\.[a-z]{2,})\/[^\s),.;]+/gi) ??
    [];
  const resumeMatch = resumeUrls.find((url) => !url.toLowerCase().includes("linkedin.com"));
  const rawHref =
    candidateValue && looksLikeExternalUrl(candidateValue) && !looksLikeLinkedInValue(candidateValue)
      ? candidateValue
      : resumeMatch;

  return rawHref ? getExternalHref(rawHref) : "";
}

function looksLikeLinkedInValue(value: string) {
  return /linkedin\.com\/|^\/?in\//i.test(value);
}

function looksLikeExternalUrl(value: string) {
  return /^(https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}/i.test(value);
}

function getPortfolioLabel(href: string) {
  return href.toLowerCase().includes("github") ? "GitHub Profile" : "Portfolio";
}

function InsightList({
  title,
  tone,
  items,
  fallback,
}: {
  title: string;
  tone: "green" | "amber";
  items: string[];
  fallback: string;
}) {
  const colorClassName = tone === "green" ? "text-emerald-700" : "text-amber-700";
  const bulletClassName = tone === "green" ? "bg-emerald-500" : "bg-amber-500";

  return (
    <div>
      <p className={`text-sm font-semibold ${colorClassName}`}>{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 grid gap-2 text-sm text-zinc-600">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className={`mt-2 size-1.5 shrink-0 rounded-full ${bulletClassName}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">{fallback}</p>
      )}
    </div>
  );
}

function formatRole(title: string | null, company: string | null) {
  if (title && company) {
    return `${title} @ ${company}`;
  }

  return title || company || "Candidate profile";
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
