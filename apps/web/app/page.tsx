import Link from "next/link";
import { DashboardActiveProjects } from "@/components/dashboard-active-projects";
import { APP_NAME } from "@asv/shared";

export default function DashboardPage() {
  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          Track {APP_NAME} projects with live job progress from the worker — no
          simulated percentages.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/create"
          className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <h2 className="font-medium">Create video</h2>
          <p className="mt-1 text-sm text-muted">
            New script, duration, voice, and style settings.
          </p>
        </Link>
        <Link
          href="/projects"
          className="rounded-xl border border-border bg-surface p-5 transition hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <h2 className="font-medium">All projects</h2>
          <p className="mt-1 text-sm text-muted">
            Status badges, progress bars, and next-step hints.
          </p>
        </Link>
      </div>
      <DashboardActiveProjects />
    </section>
  );
}
