// Creates the demo account used by /demo auto-login. Idempotent: safe to re-run.
// Usage: node --env-file=.env.local scripts/create-demo-user.mjs
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_EMAIL } = process.env;

if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !DEMO_EMAIL) {
  console.error(
    "Missing env vars: need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_EMAIL (run with --env-file=.env.local)"
  );
  process.exit(1);
}

const admin = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.createUser({
  email: DEMO_EMAIL,
  email_confirm: true,
  // Random throwaway password: nobody logs in with it, /demo uses one-time magic-link tokens.
  password: randomBytes(24).toString("base64url"),
});

if (error && error.code !== "email_exists") {
  console.error("Failed to create demo user:", error.message);
  process.exit(1);
}

if (error) {
  const { data: list, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    console.error("User exists but lookup failed:", listError.message);
    process.exit(1);
  }
  const existing = list.users.find((u) => u.email === DEMO_EMAIL);
  console.log("Demo user already exists:", existing?.id, DEMO_EMAIL);
} else {
  console.log("Demo user created:", data.user.id, data.user.email);
}

const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
  type: "magiclink",
  email: DEMO_EMAIL,
});
if (linkError) {
  console.error("generateLink check failed:", linkError.message);
  process.exit(1);
}
console.log(
  "Magic-link generation works:",
  Boolean(linkData.properties?.hashed_token)
);
