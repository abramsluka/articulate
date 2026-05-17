export type TwisterDifficulty = "easy" | "medium" | "hard";

export type Twister = {
  id: string;
  text: string;
  difficulty: TwisterDifficulty;
  targetSecondsPerRep: number;
};

export const TWISTERS: Twister[] = [
  {
    id: "lips-teeth-tongue",
    text: "The lips, the teeth, the tip of the tongue",
    difficulty: "easy",
    targetSecondsPerRep: 3,
  },
  {
    id: "red-leather",
    text: "Red leather, yellow leather",
    difficulty: "easy",
    targetSecondsPerRep: 2,
  },
  {
    id: "unique-ny",
    text: "Unique New York",
    difficulty: "easy",
    targetSecondsPerRep: 2,
  },
  {
    id: "toy-boat",
    text: "Toy boat, toy boat, toy boat",
    difficulty: "easy",
    targetSecondsPerRep: 3,
  },
  {
    id: "irish-swiss",
    text: "Irish wristwatch, Swiss wristwatch",
    difficulty: "medium",
    targetSecondsPerRep: 3,
  },
  {
    id: "big-black-bug",
    text: "The big black bug bit the big black bear",
    difficulty: "medium",
    targetSecondsPerRep: 3,
  },
  {
    id: "sea-shells",
    text: "She sells sea shells by the sea shore",
    difficulty: "medium",
    targetSecondsPerRep: 3,
  },
  {
    id: "copper-coffee",
    text: "A proper copper coffee pot",
    difficulty: "medium",
    targetSecondsPerRep: 2,
  },
  {
    id: "truly-rural",
    text: "Truly rural",
    difficulty: "hard",
    targetSecondsPerRep: 2,
  },
  {
    id: "pad-kid",
    text: "Pad kid poured curd pulled cold",
    difficulty: "hard",
    targetSecondsPerRep: 3,
  },
];

export const REPS_PER_SESSION = 3;
