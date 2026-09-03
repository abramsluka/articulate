import { createSupabaseBrowserClient } from "./supabase/client";

export class AuthRequiredError extends Error {
  constructor() {
    super("Sign in required");
    this.name = "AuthRequiredError";
  }
}

// fetch wrapper for the auth-gated AI routes. The session cookie rides along
// automatically; on a 401 (access token expired mid-session) this refreshes
// the session once and retries, then throws AuthRequiredError so the UI can
// show a sign-in-again state instead of a generic failure.
export async function fetchWithSessionRefresh(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status !== 401) return response;

  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase.auth.refreshSession();
  if (error || !data.session) {
    throw new AuthRequiredError();
  }

  const retried = await fetch(input, init);
  if (retried.status === 401) {
    throw new AuthRequiredError();
  }
  return retried;
}
