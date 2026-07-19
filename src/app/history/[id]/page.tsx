"use client";

import { useParams } from "next/navigation";
import { SessionDetail } from "@/components/history/HistoryViews";

export default function HistoryDetailRoute() {
  const params = useParams();
  return <SessionDetail sessionId={params.id as string} />;
}
