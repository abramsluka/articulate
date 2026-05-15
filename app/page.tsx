import Link from "next/link";

type ModeCard = {
  title: string;
  description: string;
  href?: string;
  comingSoon?: boolean;
};

const MODES: ModeCard[] = [
  {
    title: "Off The Cuff",
    description: "Impromptu speaking practice",
    href: "/off-the-cuff",
  },
  {
    title: "Tongue Twisters",
    description: "Diction warm-ups",
    comingSoon: true,
  },
  {
    title: "Pen Speaking",
    description: "Enunciation practice",
    comingSoon: true,
  },
  {
    title: "Daily Warm-Up",
    description: "10-minute voice routine",
    comingSoon: true,
  },
  {
    title: "Dashboard",
    description: "Your progress over time",
    comingSoon: true,
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100 md:px-6 md:py-10 lg:px-8 lg:py-12">
      <section className="mx-auto w-full max-w-6xl">
        <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
          Off The Cuff
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
          Train your voice. Every day.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MODES.map((mode) => {
            const cardContent = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold text-slate-100">{mode.title}</h2>
                  {mode.comingSoon ? (
                    <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                      Coming soon
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base">
                  {mode.description}
                </p>
              </>
            );

            if (mode.href) {
              return (
                <Link
                  key={mode.title}
                  href={mode.href}
                  className="rounded-2xl border border-sky-500/70 bg-slate-800/50 p-6 shadow-[0_0_30px_rgba(14,165,233,0.08)] transition-all duration-150 ease-out hover:scale-[1.02] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {cardContent}
                </Link>
              );
            }

            return (
              <div
                key={mode.title}
                className="rounded-2xl border border-slate-800 bg-slate-800/30 p-6 opacity-70"
              >
                {cardContent}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
