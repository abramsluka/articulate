"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname();
  const isOffTheCuffActive = pathname === "/off-the-cuff";

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-800 bg-slate-900/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 text-sm md:px-6 lg:px-8">
        <Link
          href="/"
          className="font-semibold tracking-tight text-slate-100 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Off The Cuff
        </Link>
        <Link
          href="/off-the-cuff"
          className={`rounded-md px-2.5 py-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
            isOffTheCuffActive
              ? "bg-sky-500/20 text-sky-300"
              : "text-slate-300 hover:text-slate-100"
          }`}
        >
          Off The Cuff
        </Link>
      </div>
    </nav>
  );
}
