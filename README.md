# Articulate

A public-speaking practice app built around the idea that the only way to get better at speaking is to actually speak, daily, with feedback that tells you something specific. You record, it transcribes, and an LLM scores the attempt on real dimensions rather than handing back a number with no reasoning behind it.

> **Status:** live and running as an invite-only private beta. Installable as a PWA.

---

## The four modes

**Off The Cuff** gives you a random prompt from a library of around 290, spanning creative, pitch and topic categories, then a configurable prep countdown of 3, 5 or 10 seconds (or manual), and sixty seconds to respond. It's the core mode and the one that most resembles the thing it's training you for.

**Tongue Twisters** runs 24 twisters across three difficulty tiers, scored on how accurately what you said matches the target text.

**Pen Speaking** gives you passages to read aloud, scored for clarity and delivery.

**Daily Warm-Up** is a guided ten-minute routine stepping through breath, articulation, resonance and flow drills.

Every attempt rolls into a dashboard with a score trend over time, a five-axis radar chart, streak tracking, and a twelve-badge milestone system.

---

## Engineering notes

**Two transcription systems doing two different jobs.** Every mode records through `MediaRecorder` and sends the audio to a server route that runs it through OpenAI Whisper, which is the authoritative transcript. Off The Cuff additionally runs the browser's Web Speech API concurrently, behind a hand-written TypeScript shim over the untyped `window.SpeechRecognition ?? window.webkitSpeechRecognition`, so you watch your words appear live as you speak and then get the accurate Whisper version on the review screen. Live feedback and accurate scoring have genuinely different requirements, so they get different tools.

**The model is treated as an untrusted service.** Each of the three scoring routes prompts Claude for a strict JSON schema and then refuses to trust the result: the response is stripped of any markdown fences the model added anyway, parsed, and run through a hand-written runtime type guard that field-checks every number, array and string before anything reaches the client. Malformed model output returns a 502, bad user input returns a 400, and an actual exception returns a 500, so the three failure modes stay distinguishable instead of collapsing into one generic error.

**Arithmetic stays out of the model.** In the tongue-twister route, actual and target words-per-minute are computed in TypeScript and injected into the prompt as precomputed facts. The model judges pronunciation and clarity, which it's good at, and never does the math, which it isn't reliable at.

**One table, four session shapes.** The four modes produce structurally different results, so sessions use a discriminated union with one parse guard per mode, stored in a single Supabase table with a jsonb `data` column. That keeps one unified history view working across all four without four separate tables or a lowest-common-denominator schema.

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Styling | Tailwind CSS v4 |
| Data | Supabase (Postgres, email/password auth) |
| AI | OpenAI Whisper (transcription), Anthropic Claude (scoring) |
| Hosting | Vercel, installable as a PWA |

---

## Running it locally

```bash
git clone https://github.com/abramsluka/articulate.git
cd articulate
npm install
cp .env.example .env.local   # then fill in your own values
npm run dev
```

You'll need a Supabase project with the schema in `supabase/schema.sql` applied.

---

## License

Source-available, not open source. The code is public so it can be read and evaluated, but it is not licensed for use, copying, modification, or deployment. I retain full ownership and all commercial rights. See [LICENSE](LICENSE).
