"use client";

import { useParams } from "next/navigation";

import { StatusBoard } from "@/components/StatusBoard";

export default function ProjectPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="h-full min-h-0">
      <StatusBoard projectId={params.id} />
    </div>
  );
}
