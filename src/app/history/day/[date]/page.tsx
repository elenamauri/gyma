"use client";

import { useParams } from "next/navigation";
import { DayHistory } from "@/components/history/DayHistory";

export default function HistoryDayRoute() {
  const params = useParams();
  const date = typeof params.date === "string" ? params.date : "";
  return <DayHistory dateKey={date} />;
}
