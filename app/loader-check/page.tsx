"use client";

import Loader from "@/components/Loader";

export default function LoaderCheckPage() {
  return (
    <div className="flex h-screen flex-col gap-6 bg-canvas p-10 text-[13px] text-fg">
      <Loader size="sm" label="Loading repository…" />
      <Loader size="md" label="Loading sessions…" />
      <Loader size="lg" label="Loading…" />
      <Loader size="md" />
      <div className="border border-line px-3 py-2">
        <Loader size="sm" label="Loading pull request…" />
      </div>
      <div className="px-4 py-8">
        <Loader size="md" label="Loading sessions…" />
      </div>
    </div>
  );
}
