import { desc, eq } from "drizzle-orm";
import {
  Briefcase,
  BriefcaseBusiness,
  CalendarClock,
  ChevronsUpDown,
  Crown,
  Home,
  LayoutGrid,
  List,
  MapPin,
  Mail,
  PanelTop,
  Phone,
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
import { Input } from "@/components/ui/input";
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
import { candidates } from "@/lib/db/schema";

import { deleteCandidate } from "./actions";
import { AddCandidateDialog } from "./add-candidate-dialog";
import { ProfileAccountMenuItem } from "../profile-account-menu-item";

const PAGE_SIZE = 6;

type CandidatesPageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    view?: string;
  }>;
};

export default async function CandidatesPage({ searchParams }: CandidatesPageProps) {
  const params = (await searchParams) ?? {};
  const query = typeof params.q === "string" ? params.q.trim() : "";
  const view = params.view === "list" ? "list" : "grid";
  const requestedPage = Number.parseInt(params.page ?? "1", 10);

  const syncedUser = await getDashboardUser();
  const candidateRows = await db.select().from(candidates)
    .where(eq(candidates.recruiterId, syncedUser.id)).orderBy(desc(candidates.createdAt));

  const displayName =
    [syncedUser.firstName, syncedUser.lastName].filter(Boolean).join(" ") ||
    syncedUser.email ||
    "Recruiter";
  const initials = getInitials(displayName);
  const email = syncedUser.email ?? "recruiter@ivy.ai";

  const sidebarItems = [
    { title: "Home", href: "/", icon: Home },
    { title: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
    { title: "Candidate", href: "/dashboard/candidates", icon: UsersRound, isActive: true },
    { title: "Schedules / Interview", href: "/dashboard/interviews", icon: CalendarClock },
    { title: "Settings", href: "/dashboard/settings", icon: Settings },
  ];
  const filteredCandidates = filterCandidates(candidateRows, query);
  const pageCount = Math.max(1, Math.ceil(filteredCandidates.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(Number.isFinite(requestedPage) ? requestedPage : 1, 1), pageCount);
  const visibleCandidates = filteredCandidates.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

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
              <p className="hidden text-xs text-zinc-500 sm:block">
                Add, review, and prepare candidates for screening.
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
              <h1 className="text-3xl font-semibold tracking-tight">Candidates</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
                Add candidates manually or upload resumes for AI autofill.
              </p>
            </div>
            <AddCandidateDialog />
          </section>

          <section className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <form action="/dashboard/candidates" className="flex w-full gap-2 sm:max-w-md">
              <input type="hidden" name="view" value={view} />
              <Input
                name="q"
                defaultValue={query}
                placeholder="Search candidates..."
                className="h-10 bg-white"
              />
              <Button type="submit" variant="outline" className="h-10">
                Search
              </Button>
            </form>

            <div className="flex items-center gap-2">
              <Button
                nativeButton={false}
                variant={view === "grid" ? "default" : "outline"}
                size="icon"
                aria-label="Grid view"
                render={<Link href={buildCandidatesHref({ q: query, view: "grid", page: 1 })} />}
              >
                <LayoutGrid className="size-4" />
              </Button>
              <Button
                nativeButton={false}
                variant={view === "list" ? "default" : "outline"}
                size="icon"
                aria-label="List view"
                render={<Link href={buildCandidatesHref({ q: query, view: "list", page: 1 })} />}
              >
                <List className="size-4" />
              </Button>
            </div>
          </section>

          {filteredCandidates.length === 0 ? (
            <Empty className="min-h-[280px] bg-transparent">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersRound className="size-5" />
                </EmptyMedia>
                <EmptyTitle>{query ? "No matching candidates" : "No candidates yet"}</EmptyTitle>
                <EmptyDescription>
                  {query
                    ? "Try another search or add a new candidate."
                    : "Add the first candidate to start building your recruiting pipeline."}
                </EmptyDescription>
              </EmptyHeader>
              <AddCandidateDialog />
            </Empty>
          ) : view === "grid" ? (
            <section className="grid auto-rows-fr gap-4 md:grid-cols-2 xl:grid-cols-3">
              {visibleCandidates.map((candidate) => (
                <div key={candidate.id} className="relative h-full">
                  <Link
                    href={`/dashboard/candidates/${candidate.id}`}
                    className="absolute inset-0 z-10 rounded-xl"
                    aria-label={`Open ${candidate.name} profile`}
                  />
                  <Card className="flex h-full cursor-pointer overflow-hidden border-zinc-200 bg-white shadow-sm transition-all hover:border-zinc-300 hover:shadow-md focus-within:ring-2 focus-within:ring-zinc-950">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-lg transition-colors hover:text-zinc-600">{candidate.name}</CardTitle>
                          <CardDescription className="mt-1 truncate">
                            {formatRole(candidate.currentTitle, candidate.currentCompany)}
                          </CardDescription>
                        </div>
                        <Badge variant="secondary" className="shrink-0 rounded-full">
                          new
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-4">
                      <div className="grid min-h-20 gap-2 text-sm text-zinc-600">
                        {candidate.email ? (
                          <span className="flex min-w-0 items-center gap-2">
                            <Mail className="size-4 shrink-0" />
                            <span className="truncate">{candidate.email}</span>
                          </span>
                        ) : null}
                        {candidate.phone ? (
                          <span className="flex min-w-0 items-center gap-2">
                            <Phone className="size-4 shrink-0" />
                            <span className="truncate">{candidate.phone}</span>
                          </span>
                        ) : null}
                        {candidate.location ? (
                          <span className="flex min-w-0 items-center gap-2">
                            <MapPin className="size-4 shrink-0" />
                            <span className="truncate">{candidate.location}</span>
                          </span>
                        ) : null}
                      </div>

                      {candidate.notes ? (
                        <p className="line-clamp-4 min-h-24 text-sm leading-6 text-zinc-600">
                          {candidate.notes}
                        </p>
                      ) : (
                        <p className="min-h-24 text-sm leading-6 text-zinc-500">
                          No recruiter notes yet.
                        </p>
                      )}

                      <div className="min-h-16">
                        {candidate.skills?.length ? (
                          <div className="flex flex-wrap gap-2">
                            {candidate.skills.slice(0, 5).map((skill) => (
                              <Badge key={skill} variant="secondary" className="rounded-full">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-auto flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500">
                        <span>{candidate.resumeText ? "Resume attached" : "Manual entry"}</span>
                        <div className="relative z-20 flex items-center gap-3">
                          <span>{formatDate(candidate.createdAt)}</span>
                          <DeleteCandidateButton candidateId={candidate.id} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </section>
          ) : (
            <section className="grid gap-3">
              {visibleCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className="relative grid cursor-pointer gap-3 rounded-lg border border-zinc-200 bg-white p-4 shadow-sm transition-all hover:border-zinc-300 hover:shadow-md focus-within:ring-2 focus-within:ring-zinc-950 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center"
                >
                  <Link
                    href={`/dashboard/candidates/${candidate.id}`}
                    className="absolute inset-0 z-10 rounded-lg"
                    aria-label={`Open ${candidate.name} profile`}
                  />
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h2 className="truncate text-base font-semibold">{candidate.name}</h2>
                      <Badge variant="secondary" className="rounded-full">
                        new
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-sm text-zinc-600">
                      {formatRole(candidate.currentTitle, candidate.currentCompany)}
                    </p>
                  </div>
                  <div className="grid gap-1 text-sm text-zinc-600">
                    {candidate.email ? <span className="truncate">{candidate.email}</span> : null}
                    {candidate.location ? <span className="truncate">{candidate.location}</span> : null}
                    {candidate.skills?.length ? (
                      <span className="truncate text-xs text-zinc-500">
                        {candidate.skills.slice(0, 5).join(", ")}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between gap-3 md:justify-end">
                    <span className="text-xs text-zinc-500">{formatDate(candidate.createdAt)}</span>
                    <div className="relative z-20">
                      <DeleteCandidateButton candidateId={candidate.id} />
                    </div>
                  </div>
                </div>
              ))}
            </section>
          )}

          {filteredCandidates.length > PAGE_SIZE ? (
            <Pagination
              currentPage={currentPage}
              pageCount={pageCount}
              query={query}
              view={view}
            />
          ) : null}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function formatRole(title: string | null, company: string | null) {
  if (title && company) {
    return `${title} @ ${company}`;
  }

  return title || company || "Candidate profile";
}

function isDefaultClerkImage(value: string) {
  return value.includes("img.clerk.com") && value.includes("default");
}

function filterCandidates(
  candidateRows: Array<typeof candidates.$inferSelect>,
  query: string,
) {
  if (!query) {
    return candidateRows;
  }

  const normalizedQuery = query.toLowerCase();

  return candidateRows.filter((candidate) =>
    [
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.location,
      candidate.currentTitle,
      candidate.currentCompany,
      candidate.notes,
      candidate.skills?.join(" "),
    ]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedQuery)),
  );
}

function Pagination({
  currentPage,
  pageCount,
  query,
  view,
}: {
  currentPage: number;
  pageCount: number;
  query: string;
  view: "grid" | "list";
}) {
  return (
    <nav className="mt-6 flex items-center justify-between gap-3">
      <Button
        nativeButton={false}
        variant="outline"
        className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined}
        render={
          <Link href={buildCandidatesHref({ q: query, view, page: Math.max(1, currentPage - 1) })} />
        }
      >
        Previous
      </Button>
      <span className="text-sm text-zinc-500">
        Page {currentPage} of {pageCount}
      </span>
      <Button
        nativeButton={false}
        variant="outline"
        className={currentPage === pageCount ? "pointer-events-none opacity-50" : undefined}
        render={
          <Link
            href={buildCandidatesHref({ q: query, view, page: Math.min(pageCount, currentPage + 1) })}
          />
        }
      >
        Next
      </Button>
    </nav>
  );
}

function DeleteCandidateButton({ candidateId }: { candidateId: string }) {
  return (
    <form action={deleteCandidate}>
      <input type="hidden" name="candidateId" value={candidateId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon-sm"
        className="text-zinc-500 hover:bg-red-50 hover:text-red-600"
        aria-label="Delete candidate"
      >
        <Trash2 className="size-4" />
      </Button>
    </form>
  );
}

function buildCandidatesHref({
  q,
  view,
  page,
}: {
  q: string;
  view: "grid" | "list";
  page: number;
}) {
  const params = new URLSearchParams();

  if (q) {
    params.set("q", q);
  }

  if (view !== "grid") {
    params.set("view", view);
  }

  if (page > 1) {
    params.set("page", String(page));
  }

  const queryString = params.toString();

  return queryString ? `/dashboard/candidates?${queryString}` : "/dashboard/candidates";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
