import type { Session } from "../../types/session";
import { createSupabaseBrowserClient } from "./client";

export type SaveResult =
  | { ok: true }
  | { ok: false; error: string; requiresLogin: boolean };

const SESSIONS_UPDATED_EVENT = "articulate-sessions-updated";

export function dispatchSessionsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSIONS_UPDATED_EVENT));
  }
}

export const SESSIONS_UPDATED_EVENT_NAME = SESSIONS_UPDATED_EVENT;

export async function saveSession(session: Session): Promise<SaveResult> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    return { ok: false, error: "Not logged in", requiresLogin: true };
  }

  const { error } = await supabase.from("sessions").insert({
    user_id: userData.user.id,
    mode: session.mode,
    timestamp_ms: session.timestamp,
    overall_score: session.overallScore,
    data: session,
  });

  if (error) {
    return { ok: false, error: error.message, requiresLogin: false };
  }

  dispatchSessionsUpdated();
  return { ok: true };
}

export async function loadSessions(): Promise<Session[]> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return [];
  }

  const { data, error } = await supabase
    .from("sessions")
    .select("data")
    .order("timestamp_ms", { ascending: false })
    .limit(365);

  if (error) {
    console.error("Failed to load sessions", error);
    return [];
  }

  return (data ?? []).map((row) => row.data as Session);
}

export async function deleteSessionById(sessionId: string): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("data->>id", sessionId);

  if (error) {
    console.error("Failed to delete session", error);
    return false;
  }

  dispatchSessionsUpdated();
  return true;
}

export async function clearAllSessions(): Promise<boolean> {
  const supabase = createSupabaseBrowserClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) return false;

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("user_id", userData.user.id);

  if (error) {
    console.error("Failed to clear sessions", error);
    return false;
  }

  dispatchSessionsUpdated();
  return true;
}
