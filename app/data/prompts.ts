// Prompt library and selection helpers for the Off The Cuff mode.
// Kept out of the page component so the ~290 prompts and the filtering
// logic can be read, edited and tested on their own.

export type PromptCategory =
  | "Topic"
  | "Personal"
  | "Opinion"
  | "Pitch"
  | "Creative"
  | "Abstract"
  | "Silly";
export type FilterCategory = "All" | PromptCategory;
export type OpinionTake = "best" | "worst" | "medium" | "contrarian";
export type TakeFilter = OpinionTake | "random";
export type Prompt =
  | { text: string; category: Exclude<PromptCategory, "Opinion"> }
  | { text: string; category: "Opinion"; take: OpinionTake };
export const PROMPTS = [
  { text: "Awkward silences", category: "Topic" },
  { text: "The word 'later'", category: "Topic" },
  { text: "Reinventing yourself", category: "Topic" },
  { text: "Sincerity", category: "Topic" },
  { text: "Confidence vs. arrogance", category: "Topic" },
  { text: "Micro-decisions", category: "Topic" },
  { text: "First impressions", category: "Topic" },
  { text: "Solitude", category: "Topic" },
  { text: "Routine", category: "Topic" },
  { text: "Overdelivering", category: "Topic" },
  { text: "Boredom", category: "Topic" },
  { text: "Why people give advice", category: "Topic" },
  {
    text: "Argue hybrid work is the optimal model for most knowledge teams.",
    category: "Opinion",
    take: "best",
  },
  {
    text: "Argue managers should share written expectations before every project kickoff.",
    category: "Opinion",
    take: "best",
  },
  {
    text: "Argue every student should learn public speaking before graduation.",
    category: "Opinion",
    take: "best",
  },
  {
    text: "Argue companies should budget for deep-work blocks, not just meetings.",
    category: "Opinion",
    take: "best",
  },
  {
    text: "Argue there should be no meeting-free days, ever.",
    category: "Opinion",
    take: "worst",
  },
  {
    text: "Argue all office chairs should be standing-only to build character.",
    category: "Opinion",
    take: "worst",
  },
  {
    text: "Argue adults should lose internet access after 9 p.m. on weekdays.",
    category: "Opinion",
    take: "worst",
  },
  {
    text: "Argue every team decision should be made by the loudest person in the room.",
    category: "Opinion",
    take: "worst",
  },
  {
    text: "Argue procrastination is sometimes a feature, not a bug.",
    category: "Opinion",
    take: "medium",
  },
  {
    text: "Argue social media is morally neutral; outcomes depend on how people use it.",
    category: "Opinion",
    take: "medium",
  },
  {
    text: "Argue strict routines help creativity for some people and kill it for others.",
    category: "Opinion",
    take: "medium",
  },
  {
    text: "Argue remote work improves focus but can quietly weaken mentorship.",
    category: "Opinion",
    take: "medium",
  },
  {
    text: "Argue boredom is essential to a good life.",
    category: "Opinion",
    take: "contrarian",
  },
  {
    text: "Argue silence often communicates more than speech.",
    category: "Opinion",
    take: "contrarian",
  },
  {
    text: "Argue introverts often make the best leaders.",
    category: "Opinion",
    take: "contrarian",
  },
  {
    text: "Argue small talk is an underrated professional skill.",
    category: "Opinion",
    take: "contrarian",
  },
  {
    text: "Pitch a TV show that takes place entirely in an elevator.",
    category: "Pitch",
  },
  {
    text: "Pitch yourself for a job you are not technically qualified for.",
    category: "Pitch",
  },
  {
    text: "Pitch a startup solving a problem you personally run into every week.",
    category: "Pitch",
  },
  {
    text: "Convince your manager to let you work from another city for one month.",
    category: "Pitch",
  },
  {
    text: "Pitch a paid service that helps roommates split chores without arguments.",
    category: "Pitch",
  },
  {
    text: "Pitch a feature that would make your favorite app impossible to quit.",
    category: "Pitch",
  },
  {
    text: "Sell a local bookstore on hosting one event that doubles foot traffic.",
    category: "Pitch",
  },
  {
    text: "Pitch a neighborhood subscription that makes daily errands easier.",
    category: "Pitch",
  },
  {
    text: "Pitch a podcast format that turns boring meetings into entertainment.",
    category: "Pitch",
  },
  {
    text: "Convince a skeptical friend to join a side project this weekend.",
    category: "Pitch",
  },
  {
    text: "Walk through what you do in the first 10 minutes after waking up.",
    category: "Personal",
  },
  {
    text: "Tell the story of a friendship that changed how you see yourself.",
    category: "Personal",
  },
  {
    text: "Describe a moment from childhood that still affects your decisions.",
    category: "Personal",
  },
  {
    text: "Tell the story of a tiny risk that paid off.",
    category: "Personal",
  },
  {
    text: "Describe a routine you outgrew and what replaced it.",
    category: "Personal",
  },
  {
    text: "Tell the story of a time you misread a room and recovered.",
    category: "Personal",
  },
  {
    text: "Describe a compliment you did not expect but never forgot.",
    category: "Personal",
  },
  {
    text: "Walk through a decision you made quickly but still trust.",
    category: "Personal",
  },
  {
    text: "Describe a place you return to when you need to reset.",
    category: "Personal",
  },
  {
    text: "Tell the story of a project you almost abandoned too early.",
    category: "Personal",
  },
  {
    text: "Design a holiday for something humans rarely celebrate.",
    category: "Creative",
  },
  {
    text: "Invent a sport that could only exist in zero gravity.",
    category: "Creative",
  },
  {
    text: "Describe the most visited museum exhibit of the year 2125.",
    category: "Creative",
  },
  {
    text: "Create a city rule that sounds strange but makes life better.",
    category: "Creative",
  },
  {
    text: "Invent a restaurant where the menu changes with your mood.",
    category: "Creative",
  },
  {
    text: "Design a classroom that makes adults feel curious again.",
    category: "Creative",
  },
  {
    text: "Imagine a phone feature people would call magic in 20 years.",
    category: "Creative",
  },
  {
    text: "Create a new genre of party that does not involve music.",
    category: "Creative",
  },
  {
    text: "Invent an app that helps strangers collaborate in five minutes.",
    category: "Creative",
  },
  {
    text: "Describe a playground built specifically for stressed adults.",
    category: "Creative",
  },
  {
    text: "Convince me hot dogs are definitely sandwiches.",
    category: "Silly",
  },
  {
    text: "Describe what dogs say at a bar after the humans leave.",
    category: "Silly",
  },
  {
    text: "Defend pigeons as the most underrated animal in any city.",
    category: "Silly",
  },
  {
    text: "Argue your laptop charger has a dramatic personality.",
    category: "Silly",
  },
  {
    text: "Pitch a luxury spa built exclusively for tired backpacks.",
    category: "Silly",
  },
  {
    text: "Convince a jury the missing sock is innocent.",
    category: "Silly",
  },
  {
    text: "Explain how elevators secretly rank every passenger.",
    category: "Silly",
  },
  {
    text: "Give an acceptance speech for best snack in your kitchen.",
    category: "Silly",
  },
  {
    text: "Describe a reality show where houseplants review their owners.",
    category: "Silly",
  },
  {
    text: "Argue cereal should be eaten with chopsticks for better pacing.",
    category: "Silly",
  },
  {
    text: "What is the difference between confidence and arrogance?",
    category: "Abstract",
  },
  {
    text: "Why do humans tell stories before they trust data?",
    category: "Abstract",
  },
  {
    text: "Can taste be taught, or only developed?",
    category: "Abstract",
  },
  {
    text: "When does patience become avoidance?",
    category: "Abstract",
  },
  {
    text: "Why does certainty sound persuasive even when it is wrong?",
    category: "Abstract",
  },
  {
    text: "What makes advice feel generous instead of intrusive?",
    category: "Abstract",
  },
  {
    text: "Is consistency a virtue or just social predictability?",
    category: "Abstract",
  },
  {
    text: "When is ambition expansive, and when is it self-erasing?",
    category: "Abstract",
  },
  {
    text: "What turns experience into wisdom instead of just memory?",
    category: "Abstract",
  },
  {
    text: "Why do people confuse urgency with importance?",
    category: "Abstract",
  },
] satisfies Prompt[];

export const CATEGORIES: FilterCategory[] = [
  "All",
  "Topic",
  "Opinion",
  "Pitch",
  "Personal",
  "Creative",
  "Silly",
  "Abstract",
];
export const TAKE_OPTIONS: { value: TakeFilter; label: string }[] = [
  { value: "best", label: "Best" },
  { value: "worst", label: "Worst" },
  { value: "medium", label: "Medium" },
  { value: "contrarian", label: "Contrarian" },
  { value: "random", label: "Random" },
];

export const isOpinionPrompt = (prompt: Prompt): prompt is Extract<Prompt, { category: "Opinion" }> =>
  prompt.category === "Opinion";

export const getPromptsForSelection = (
  category: FilterCategory,
  selectedTake: TakeFilter
) => {
  if (category === "All") {
    return PROMPTS;
  }
  if (category !== "Opinion") {
    return PROMPTS.filter((prompt) => prompt.category === category);
  }
  return PROMPTS.filter((prompt) =>
    isOpinionPrompt(prompt) &&
    (selectedTake === "random" || prompt.take === selectedTake)
  );
};

export const formatTakeLabel = (take: OpinionTake) =>
  take.charAt(0).toUpperCase() + take.slice(1);
