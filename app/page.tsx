"use client";

import { useEffect, useState } from "react";

type PromptCategory = "Personal" | "Opinion" | "Creative" | "Abstract" | "Silly";
type FilterCategory = "All" | PromptCategory;
type Prompt = { text: string; category: PromptCategory };

const PROMPTS = [
  { text: "Describe your ideal Saturday from morning to night.", category: "Personal" },
  { text: "What small habit has changed your life the most?", category: "Personal" },
  { text: "Describe your childhood home to someone who has never visited it.", category: "Personal" },
  { text: "What is a lesson you learned too late?", category: "Personal" },
  { text: "Describe a place that makes you instantly calmer.", category: "Personal" },
  { text: "Tell the story of a time you changed your mind.", category: "Personal" },
  { text: "Describe a smell that immediately brings back a memory.", category: "Personal" },
  { text: "What is a small act of kindness you still remember?", category: "Personal" },
  { text: "Describe a moment you felt unexpectedly proud.", category: "Personal" },
  { text: "Describe your ideal morning routine.", category: "Personal" },
  { text: "If your life were a playlist, what song opens it?", category: "Personal" },
  { text: "What advice would you give your future self five years from now?", category: "Personal" },
  { text: "Argue that cereal is or is not soup.", category: "Opinion" },
  { text: "Should meetings be capped at 15 minutes by default?", category: "Opinion" },
  { text: "Should cities prioritize bikes over cars?", category: "Opinion" },
  { text: "Should schools start later in the morning?", category: "Opinion" },
  { text: "Should remote work be the default?", category: "Opinion" },
  { text: "Should everyone learn basic public speaking in school?", category: "Opinion" },
  { text: "Would you trade convenience for privacy?", category: "Opinion" },
  { text: "Should phones be allowed at the dinner table?", category: "Opinion" },
  { text: "Should AI tools be mandatory in classrooms?", category: "Opinion" },
  { text: "Should people specialize early or explore broadly?", category: "Opinion" },
  { text: "Should every company publish salaries?", category: "Opinion" },
  { text: "Should people read more fiction or nonfiction?", category: "Opinion" },
  { text: "Pitch a product you would invent if you had $1M.", category: "Creative" },
  { text: "Describe your dream app in one minute.", category: "Creative" },
  { text: "If you had to create a new holiday, what would it celebrate?", category: "Creative" },
  { text: "If your city had a mascot, what should it be?", category: "Creative" },
  { text: "Describe a fictional world you would want to live in.", category: "Creative" },
  { text: "If you had one billboard for the world to read, what would it say?", category: "Creative" },
  { text: "If you had to teach one class tomorrow, what would it be?", category: "Creative" },
  { text: "Describe an app feature that would genuinely reduce stress.", category: "Creative" },
  { text: "If you had to start over in a new city, what would you do first?", category: "Creative" },
  { text: "Describe a day in your life ten years from now.", category: "Creative" },
  { text: "Describe a color to someone who has never seen before.", category: "Abstract" },
  { text: "Explain why boredom is either useful or dangerous.", category: "Abstract" },
  { text: "What does confidence look like in everyday life?", category: "Abstract" },
  { text: "Is failure mostly a mindset or mostly an outcome?", category: "Abstract" },
  { text: "What is the difference between being busy and being productive?", category: "Abstract" },
  { text: "What is more important: consistency or intensity?", category: "Abstract" },
  { text: "What makes a conversation truly memorable?", category: "Abstract" },
  { text: "What does success look like when no one is watching?", category: "Abstract" },
  { text: "How do you define courage in ordinary life?", category: "Abstract" },
  { text: "Is optimism a skill you can practice?", category: "Abstract" },
  { text: "What does healthy ambition look like?", category: "Abstract" },
  { text: "What does balance mean to you right now?", category: "Abstract" },
  { text: "If you could rename Monday, what would you call it?", category: "Silly" },
  { text: "Would you rather be extremely lucky or extremely disciplined?", category: "Silly" },
  { text: "If your week had a theme song, what would it be and why?", category: "Silly" },
  { text: "What everyday object deserves a complete redesign?", category: "Silly" },
  { text: "If you could solve one tiny annoyance forever, what would it be?", category: "Silly" },
  { text: "Explain a complex topic using only kitchen analogies.", category: "Silly" },
  { text: "If you had to ban one buzzword, what would it be?", category: "Silly" },
  { text: "How would you explain the internet to someone from 1850?", category: "Silly" },
  { text: "What should people stop apologizing for?", category: "Silly" },
  { text: "What is one thing people overcomplicate?", category: "Silly" },
  { text: "What is something that sounds boring but is actually fascinating?", category: "Silly" },
  { text: "What role does humor play in difficult conversations?", category: "Silly" },
] satisfies Prompt[];

const CATEGORIES: FilterCategory[] = [
  "All",
  "Personal",
  "Opinion",
  "Creative",
  "Abstract",
  "Silly",
];

const TIMER_DURATION = 60;

const shuffle = <T,>(items: T[]) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("All");
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [isPromptVisible, setIsPromptVisible] = useState(true);
  const [unusedPrompts, setUnusedPrompts] = useState<Prompt[]>(() =>
    shuffle(PROMPTS)
  );
  const [secondsLeft, setSecondsLeft] = useState(TIMER_DURATION);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    document.title = "Off The Cuff";
  }, []);

  useEffect(() => {
    const filteredPrompts =
      activeCategory === "All"
        ? PROMPTS
        : PROMPTS.filter((prompt) => prompt.category === activeCategory);

    setUnusedPrompts(shuffle(filteredPrompts));
    setCurrentPrompt(null);
    setIsTimerRunning(false);
    setSecondsLeft(TIMER_DURATION);
  }, [activeCategory]);

  useEffect(() => {
    if (!currentPrompt) {
      return;
    }

    setIsPromptVisible(false);
    const animationFrame = requestAnimationFrame(() => {
      setIsPromptVisible(true);
    });

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [currentPrompt]);

  useEffect(() => {
    if (!isTimerRunning) {
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((previousSeconds) => {
        if (previousSeconds <= 1) {
          clearInterval(timer);
          setIsTimerRunning(false);
          return 0;
        }
        return previousSeconds - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isTimerRunning]);

  const pickPrompt = () => {
    if (PROMPTS.length === 0) {
      return;
    }

    const filteredPrompts =
      activeCategory === "All"
        ? PROMPTS
        : PROMPTS.filter((prompt) => prompt.category === activeCategory);
    if (filteredPrompts.length === 0) {
      return;
    }

    let promptPool = unusedPrompts;
    if (promptPool.length === 0) {
      const refilledPool = shuffle(
        currentPrompt
          ? filteredPrompts.filter((prompt) => prompt.text !== currentPrompt.text)
          : filteredPrompts
      );
      promptPool = refilledPool;
    }

    const [nextPrompt, ...remainingPrompts] = promptPool;
    if (!nextPrompt) {
      return;
    }

    setCurrentPrompt(nextPrompt);
    setUnusedPrompts(remainingPrompts);
    setSecondsLeft(TIMER_DURATION);
    setIsTimerRunning(true);
  };

  const resetTimer = () => {
    setIsTimerRunning(false);
    setSecondsLeft(TIMER_DURATION);
  };

  const timerLabel = `${Math.floor(secondsLeft / 60)}:${String(
    secondsLeft % 60
  ).padStart(2, "0")}`;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <section className="w-full max-w-3xl text-center">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl">
          Off The Cuff
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
          Practice thinking and speaking on your feet. Click the button, then
          speak for 60 seconds about whatever appears.
        </p>

        <div className="mx-auto mt-8 flex w-full max-w-2xl flex-wrap items-center justify-center gap-2">
          {CATEGORIES.map((category) => {
            const isActive = category === activeCategory;
            return (
              <button
                key={category}
                type="button"
                onClick={() => {
                  if (!isActive) {
                    setActiveCategory(category);
                  }
                }}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  isActive
                    ? "bg-sky-400 font-semibold text-slate-950"
                    : "bg-slate-900 font-medium text-slate-300 hover:bg-slate-800"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={pickPrompt}
          className="mt-10 rounded-2xl bg-sky-500 px-10 py-5 text-lg font-semibold text-slate-950 shadow-lg shadow-sky-900/30 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
        >
          Give me a prompt
        </button>

        {currentPrompt ? (
          <div className="mx-auto mt-6 flex w-full max-w-md flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <p className="text-4xl font-semibold tabular-nums text-sky-300 sm:text-5xl">
                {timerLabel}
              </p>
              <button
                type="button"
                onClick={resetTimer}
                className="rounded-lg border border-slate-600 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-200 transition hover:border-slate-400 hover:bg-slate-800"
              >
                Reset
              </button>
            </div>
            {secondsLeft === 0 ? (
              <p className="animate-pulse text-sm font-medium tracking-wide text-amber-300">
                Time&apos;s up!
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 min-h-40 rounded-2xl border border-slate-800 bg-slate-900/70 p-8 backdrop-blur-sm">
          {currentPrompt ? (
            <p
              className={`text-2xl font-medium leading-relaxed text-slate-100 transition-all duration-300 ease-out ${
                isPromptVisible
                  ? "translate-y-0 opacity-100"
                  : "translate-y-1 opacity-0"
              }`}
            >
              {currentPrompt.text}
            </p>
          ) : (
            <p className="text-base text-slate-400">
              Your prompt will appear here.
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
