import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

// Auth gate for the AI-spending API routes. The @supabase/ssr browser client
// stores the session in cookies, so the server can read it straight off the
// request. getUser() validates the access token against Supabase itself, so a
// forged or expired cookie is rejected here, before any paid provider call.
export async function requireAuth(
  request: NextRequest
): Promise<NextResponse | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    console.error("requireAuth: missing Supabase env vars");
    return NextResponse.json(
      { error: "Auth is not configured" },
      { status: 500 }
    );
  }

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      // Read-only check: session refresh stays with the browser client, so
      // there is nothing to write back onto the response.
      setAll: () => {},
    },
  });

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json(
      { error: "Please sign in to use this feature.", code: "AUTH_REQUIRED" },
      { status: 401 }
    );
  }

  return null;
}
