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
  {
    id: "peter-piper",
    text: "Peter Piper picked a peck of pickled peppers",
    difficulty: "medium",
    targetSecondsPerRep: 4,
  },
  {
    id: "woodchuck",
    text: "How much wood would a woodchuck chuck if a woodchuck could chuck wood",
    difficulty: "hard",
    targetSecondsPerRep: 5,
  },
  {
    id: "betty-botter",
    text: "Betty Botter bought some butter but the butter was bitter",
    difficulty: "medium",
    targetSecondsPerRep: 4,
  },
  {
    id: "fuzzy-wuzzy",
    text: "Fuzzy Wuzzy was a bear, Fuzzy Wuzzy had no hair",
    difficulty: "easy",
    targetSecondsPerRep: 3,
  },
  {
    id: "rubber-baby",
    text: "Rubber baby buggy bumpers",
    difficulty: "medium",
    targetSecondsPerRep: 2,
  },
  {
    id: "six-sheik",
    text: "The sixth sick sheik's sixth sheep's sick",
    difficulty: "hard",
    targetSecondsPerRep: 3,
  },
  {
    id: "three-throws",
    text: "Three free throws",
    difficulty: "easy",
    targetSecondsPerRep: 2,
  },
  {
    id: "round-rocks",
    text: "Round and round the rugged rocks the ragged rascal ran",
    difficulty: "hard",
    targetSecondsPerRep: 4,
  },
  {
    id: "selfish-shellfish",
    text: "Selfish shellfish",
    difficulty: "easy",
    targetSecondsPerRep: 2,
  },
  {
    id: "she-sees-cheese",
    text: "She sees cheese",
    difficulty: "easy",
    targetSecondsPerRep: 2,
  },
  {
    id: "greek-grapes",
    text: "Greek grapes",
    difficulty: "easy",
    targetSecondsPerRep: 2,
  },
  {
    id: "fred-ted",
    text: "Fred fed Ted bread and Ted fed Fred bread",
    difficulty: "medium",
    targetSecondsPerRep: 3,
  },
  {
    id: "ice-cream",
    text: "I scream, you scream, we all scream for ice cream",
    difficulty: "medium",
    targetSecondsPerRep: 3,
  },
  {
    id: "clam-cream-can",
    text: "How can a clam cram in a clean cream can",
    difficulty: "hard",
    targetSecondsPerRep: 3,
  },
];

export const REPS_PER_SESSION = 3;
