import { CreateVideoForm } from "@/components/create-video-form";

export default function CreatePage() {
  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Create video
        </h1>
        <p className="mt-2 text-muted">
          Configure your story and output settings. The project is saved to the
          API; automated generation connects in Phase 10+.
        </p>
      </div>
      <CreateVideoForm />
    </section>
  );
}
