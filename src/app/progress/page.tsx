"use client";

import { ProgressPage } from "@/components/progress/ProgressPage";
import { PageHeader } from "@/components/ui/PageHeader";

export default function ProgressRoute() {
  return (
    <div className="space-y-5">
      <PageHeader description="Carichi e peso corporeo." />
      <ProgressPage />
    </div>
  );
}
