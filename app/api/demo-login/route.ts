import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { rateLimit } from "@/app/lib/rate-limit";

const safeCodeMatch = (candidate: string, expected: string) => {
  const candidateDigest = createHash("sha256").update(candidate).digest();
  const expectedDigest = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateDigest, expectedDigest);
};

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "demo-login", 10, 5 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await request.json();
    const { code } = body;

    const accessCode = process.env.DEMO_ACCESS_CODE;
    const demoEmail = process.env.DEMO_EMAIL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!accessCode || !demoEmail || !serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Demo login is not configured" },
        { status: 500 }
      );
    }

    if (typeof code !== "string" || !safeCodeMatch(code, accessCode)) {
      return NextResponse.json(
        { error: "Invalid demo access code" },
        { status: 401 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: demoEmail,
    });

    if (error || !data.properties?.hashed_token) {
      console.error("Demo login error:", error);
      return NextResponse.json(
        { error: "Failed to create demo session" },
        { status: 500 }
      );
    }

    return NextResponse.json({ tokenHash: data.properties.hashed_token });
  } catch (error) {
    console.error("Demo login error:", error);
    return NextResponse.json(
      { error: "Failed to create demo session" },
      { status: 500 }
    );
  }
}
