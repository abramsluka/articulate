"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "../lib/supabase/client";

type AuthState =
  | { kind: "loading" }
  | { kind: "logged-out" }
  | { kind: "logged-in"; email: string };

const supabase = createSupabaseBrowserClient();

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const isDashboardActive = pathname === "/";
  const [authState, setAuthState] = useState<AuthState>({ kind: "loading" });
  const navLinkBaseClass =
    "rounded-md px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      if (data.user?.email) {
        setAuthState({ kind: "logged-in", email: data.user.email });
      } else {
        setAuthState({ kind: "logged-out" });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setAuthState({ kind: "logged-in", email: session.user.email });
      } else {
        setAuthState({ kind: "logged-out" });
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 text-sm md:px-6 lg:px-8">
        <Link
          href="/"
          className="font-semibold tracking-tight text-slate-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Articulate
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/"
            className={`${navLinkBaseClass} ${
              isDashboardActive
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            Dashboard
          </Link>
          {authState.kind === "logged-in" ? (
            <div className="flex items-center gap-2 text-sm">
              <span className="hidden max-w-[12rem] truncate text-slate-400 sm:inline">
                {authState.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md px-2 py-1 text-slate-300 transition-colors hover:bg-slate-800 hover:text-slate-100"
              >
                Sign out
              </button>
            </div>
          ) : authState.kind === "logged-out" ? (
            <div className="flex items-center gap-2 text-sm sm:gap-3">
              <Link href="/login" className="text-slate-300 transition-colors hover:text-slate-100">
                Log in
              </Link>
              <Link href="/signup" className="text-slate-300 transition-colors hover:text-slate-100">
                Sign up
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
