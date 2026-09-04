import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import demoSeed from "@/app/data/demoSeed.json";

// Nightly demo-account reset, invoked by Vercel cron (see vercel.json).
// Deletes every session row belonging to the demo user, then re-inserts the
// single seeded session backdated ~2.5 days. Recordings never reach the
// server or storage (audio stays as in-browser blobs), so session rows are
// the only demo state to clean.
const SEED_AGE_MS = 60 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const demoEmail = process.env.DEMO_EMAIL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!cronSecret || !demoEmail || !serviceRoleKey || !supabaseUrl) {
    return NextResponse.json(
      { error: "Demo reset is not configured" },
      { status: 500 }
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userList, error: listError } = await admin.auth.admin.listUsers();
  if (listError) {
    return NextResponse.json(
      { error: `Demo user lookup failed: ${listError.message}` },
      { status: 500 }
    );
  }

  const demoUser = userList.users.find((user) => user.email === demoEmail);
  if (!demoUser) {
    return NextResponse.json({ error: "Demo user not found" }, { status: 500 });
  }

  const { data: deletedRows, error: deleteError } = await admin
    .from("sessions")
    .delete()
    .eq("user_id", demoUser.id)
    .select("user_id");
  if (deleteError) {
    return NextResponse.json(
      { error: `Demo session delete failed: ${deleteError.message}` },
      { status: 500 }
    );
  }

  const timestamp = Date.now() - SEED_AGE_MS;
  const seedSession = { ...demoSeed, id: randomUUID(), timestamp };
  const { error: insertError } = await admin.from("sessions").insert({
    user_id: demoUser.id,
    mode: seedSession.mode,
    timestamp_ms: timestamp,
    overall_score: seedSession.overallScore,
    data: seedSession,
  });
  if (insertError) {
    return NextResponse.json(
      { error: `Seed insert failed: ${insertError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    deletedSessions: deletedRows?.length ?? 0,
    seededSessionId: seedSession.id,
    seededTimestamp: new Date(timestamp).toISOString(),
  });
}
