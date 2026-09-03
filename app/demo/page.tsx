"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

const supabase = createSupabaseBrowserClient();

function DemoLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code") ?? "";
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const signInToDemo = async () => {
      if (!code) {
        setError("This demo link is missing its access code.");
        return;
      }

      const response = await fetch("/api/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.error ?? "Failed to start the demo session.");
        return;
      }

      const { tokenHash } = await response.json();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type: "email",
        token_hash: tokenHash,
      });

      if (verifyError) {
        setError(verifyError.message);
        return;
      }

      router.replace("/");
    };

    void signInToDemo();
  }, [code, router]);

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-center shadow-xl shadow-black/20 sm:p-8">
      {error ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Demo link didn&apos;t work
          </h1>
          <p className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
          <p className="mt-4 text-sm text-slate-400">
            Double-check the link you were sent, or{" "}
            <Link href="/login" className="text-sky-300 hover:text-sky-200">
              log in here
            </Link>
            .
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Setting up your demo...
          </h1>
          <p className="mt-3 text-sm text-slate-400">
            Signing you in to Articulate. This only takes a second.
          </p>
        </>
      )}
    </div>
  );
}

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <section className="mx-auto flex w-full max-w-md items-center justify-center pt-8 sm:pt-12">
        <Suspense fallback={null}>
          <DemoLogin />
        </Suspense>
      </section>
    </main>
  );
}
