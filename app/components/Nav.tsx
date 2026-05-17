"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const isDashboardActive = pathname === "/";
  const isOffTheCuffActive = pathname === "/off-the-cuff";
  const isTongueTwistersActive = pathname === "/tongue-twisters";
  const isPenSpeakingActive = pathname === "/pen-speaking";
  const navLinkBaseClass =
    "rounded-md px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900";

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 text-sm md:px-6 lg:px-8">
        <Link
          href="/"
          className="font-semibold tracking-tight text-slate-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Articulate
        </Link>
        <div className="flex items-center gap-1">
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
          <Link
            href="/off-the-cuff"
            className={`${navLinkBaseClass} ${
              isOffTheCuffActive
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            Off The Cuff
          </Link>
          <Link
            href="/tongue-twisters"
            className={`${navLinkBaseClass} ${
              isTongueTwistersActive
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            Tongue Twisters
          </Link>
          <Link
            href="/pen-speaking"
            className={`${navLinkBaseClass} ${
              isPenSpeakingActive
                ? "bg-sky-500/20 text-sky-300"
                : "text-slate-300 hover:text-slate-100"
            }`}
          >
            Pen Speaking
          </Link>
        </div>
      </div>
    </nav>
  );
}
