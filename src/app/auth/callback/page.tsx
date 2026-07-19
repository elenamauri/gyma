"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      router.replace("/settings");
      return;
    }
    supabase.auth.getSession().then(() => {
      router.replace("/settings");
    });
  }, [router]);

  return (
    <p className="text-sm text-muted">Completamento accesso…</p>
  );
}
