"use client";

import { HistoryPage } from "@/components/history/HistoryViews";
import { PageHeader } from "@/components/ui/PageHeader";

export default function HistoryRoute() {
  return (
    <div className="space-y-5">
      <PageHeader description="Sessioni, streak e calendario." />
      <HistoryPage />
    </div>
  );
}
