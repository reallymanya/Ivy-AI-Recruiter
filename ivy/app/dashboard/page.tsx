import { currentUser, auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { syncCurrentUser } from "@/lib/auth/sync-user";

export default async function DashboardPage() {
  await auth.protect();

  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const syncedUser = await syncCurrentUser(user);
  const displayName =
    [syncedUser.firstName, syncedUser.lastName].filter(Boolean).join(" ") ||
    syncedUser.email ||
    "Recruiter";

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Badge variant="secondary" className="mb-3 rounded-full">
              Recruiter dashboard
            </Badge>
            <h1 className="text-3xl font-semibold tracking-tight">
              Welcome back, {displayName}.
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Your Clerk profile has been synced to Ivy&apos;s Neon database.
            </p>
          </div>
          <Button nativeButton={false} render={<Link href="/" />}>Back to site</Button>
        </header>

        <section className="grid flex-1 gap-4 py-8 md:grid-cols-3">
          {[
            ["Open roles", "0", "Create your first job intake and screening rubric."],
            ["Candidates", "0", "Imported candidates will appear here."],
            ["Voice screens", "0", "Completed screening sessions will populate this view."],
          ].map(([title, value, description]) => (
            <Card key={title} className="rounded-2xl">
              <CardHeader>
                <CardDescription>{title}</CardDescription>
                <CardTitle className="text-4xl">{value}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-6 text-zinc-600">{description}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      </div>
    </main>
  );
}
