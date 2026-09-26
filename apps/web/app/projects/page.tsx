import Link from "next/link";
import { ProjectsList } from "@/components/projects-list";

export default function ProjectsPage() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Projects
          </h1>
          <p className="mt-1 text-muted">
            Progress bars refresh automatically while generation jobs run.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium hover:border-accent"
        >
          New project
        </Link>
      </div>
      <ProjectsList />
    </section>
  );
}
