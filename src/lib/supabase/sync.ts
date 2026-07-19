import type { AppData } from "@/lib/types";
import { DEFAULT_SETTINGS } from "@/lib/types";
import { getSupabase } from "./client";

export interface CloudSnapshot {
  payload: AppData;
  updatedAt: string;
}

function emptyPayload(): AppData {
  return {
    programs: [],
    routines: [],
    sessions: [],
    bodyweightLog: [],
    favorites: [],
    recentExerciseIds: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

export async function fetchCloudData(): Promise<CloudSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_data")
    .select("payload, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const payload = {
    ...emptyPayload(),
    ...(data.payload as Partial<AppData>),
    programs: Array.isArray((data.payload as Partial<AppData>)?.programs)
      ? ((data.payload as Partial<AppData>).programs as AppData["programs"])
      : [],
    settings: {
      ...DEFAULT_SETTINGS,
      ...((data.payload as Partial<AppData>)?.settings ?? {}),
    },
  };

  return {
    payload,
    updatedAt: data.updated_at as string,
  };
}

export async function pushCloudData(payload: AppData): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Supabase non configurato");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non autenticato");

  const updatedAt = new Date().toISOString();
  const { error } = await supabase.from("user_data").upsert(
    {
      user_id: user.id,
      payload,
      updated_at: updatedAt,
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
  return updatedAt;
}

/** Prefer cloud if it has data; otherwise keep local and upload it. */
export function shouldPreferCloud(
  local: AppData,
  cloud: CloudSnapshot | null,
): boolean {
  if (!cloud) return false;
  const cloudHas =
    cloud.payload.programs.length > 0 ||
    cloud.payload.routines.length > 0 ||
    cloud.payload.sessions.length > 0 ||
    cloud.payload.bodyweightLog.length > 0;
  const localHas =
    local.programs.length > 0 ||
    local.routines.length > 0 ||
    local.sessions.length > 0 ||
    local.bodyweightLog.length > 0;

  if (cloudHas) return true;
  if (!cloudHas && localHas) return false;
  return false;
}
