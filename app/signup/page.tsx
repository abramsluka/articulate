import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <section className="mx-auto flex w-full max-w-xl items-center justify-center pt-8 sm:pt-12">
        <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow-xl shadow-black/20 sm:p-8">
          <h1 className="text-balance text-2xl font-semibold tracking-tight text-slate-100 sm:text-3xl">
            Articulate is currently invitation-only
          </h1>
          <p className="mt-4 text-pretty text-slate-300">
            We're running a private beta to keep this app focused and stable. If you'd like access, email
            pabrams@gmail.com and we'll send you an invitation.
          </p>
          <p className="mt-5 text-sm text-slate-400">
            Already invited? Check your email for a sign-in link or{" "}
            <Link href="/login" className="text-sky-300 hover:text-sky-200">
              log in here
            </Link>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
