import { Briefcase, CalendarClock, Home, PanelTop, Settings, UsersRound } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
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
import { getSettingsForUser } from "@/lib/interview/agent-settings";

import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const user = await getDashboardUser();
  const settings = await getSettingsForUser(user.id);
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Recruiter";
  const items = [
    { title: "Home", href: "/", icon: Home },
    { title: "Jobs", href: "/dashboard/jobs", icon: Briefcase },
    { title: "Candidate", href: "/dashboard/candidates", icon: UsersRound },
    { title: "Schedules / Interview", href: "/dashboard/interviews", icon: CalendarClock },
    { title: "Settings", href: "/dashboard/settings", icon: Settings, active: true },
  ];

  return (
    <SidebarProvider style={{ "--sidebar-width-icon": "4rem" } as CSSProperties}>
      <Sidebar collapsible="icon" className="border-zinc-200">
        <SidebarHeader className="h-16 justify-center border-b border-zinc-200 px-3 py-0 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-2">
          <SidebarMenu><SidebarMenuItem>
            <SidebarMenuButton size="lg" className="gap-3 group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0" render={<Link href="/dashboard" />}>
              <span className="flex size-10 items-center justify-center rounded-lg bg-zinc-950 text-white"><PanelTop className="!size-5" /></span>
              <span className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden"><span className="truncate text-sm font-semibold">Ivy Recruiter</span><span className="truncate text-xs text-zinc-500">AI hiring workspace</span></span>
            </SidebarMenuButton>
          </SidebarMenuItem></SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup><SidebarGroupContent><SidebarMenu>
            {items.map((item) => <SidebarMenuItem key={item.title}>
              <SidebarMenuButton size="lg" tooltip={item.title} isActive={item.active} className="gap-3 text-base group-data-[collapsible=icon]:!size-10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:!p-0" render={item.href === "/dashboard" ? <a href="/dashboard" /> : <Link href={item.href} />}>
                <item.icon className="!size-5" /><span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>)}
          </SidebarMenu></SidebarGroupContent></SidebarGroup>
        </SidebarContent>
        <div className="mt-auto border-t border-zinc-200 p-3 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Avatar className="size-9">{user.imageUrl && !isDefaultClerkImage(user.imageUrl) ? <AvatarImage src={user.imageUrl} alt={displayName} /> : null}<AvatarFallback className="bg-zinc-950 text-white">{initials(displayName)}</AvatarFallback></Avatar>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden"><p className="truncate text-sm font-medium">{displayName}</p><p className="truncate text-xs text-zinc-500">{user.email}</p></div>
          </div>
        </div>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-screen bg-zinc-50 text-zinc-950">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-zinc-200 bg-zinc-50/90 px-4 backdrop-blur sm:px-6">
          <SidebarTrigger /><div><p className="text-sm font-medium">Settings</p><p className="hidden text-xs text-zinc-500 sm:block">Configure how Ivy conducts interviews.</p></div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <section className="mb-6"><h1 className="text-2xl font-semibold">AI recruiter settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Set interview length, voice behavior, and reusable AI instructions once. Ivy applies them automatically to candidate interviews.</p></section>
          <SettingsForm settings={settings} recruiterEmail={user.email ?? ""} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function isDefaultClerkImage(value: string) {
  return value.includes("img.clerk.com") && value.includes("default");
}
