export type PassageDifficulty = "easy" | "medium" | "hard";

export type PenPassage = {
  id: string;
  text: string;
  difficulty: PassageDifficulty;
};

export const PEN_PASSAGES: PenPassage[] = [
  { id: "quick-fox", text: "The quick brown fox jumps over the lazy dog.", difficulty: "easy" },
  {
    id: "seashells",
    text: "She sells seashells down by the seashore. Surely no shells stop her stride.",
    difficulty: "easy",
  },
  {
    id: "early-bird",
    text: "The early bird catches the worm, but the second mouse gets the cheese.",
    difficulty: "easy",
  },
  {
    id: "stella",
    text: "Please call Stella. Ask her to bring these things with her from the store: six spoons of fresh snow peas, five thick slabs of blue cheese, and maybe a snack for her brother Bob.",
    difficulty: "medium",
  },
  {
    id: "rainbow",
    text: "When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow. The rainbow is a division of white light into many beautiful colors.",
    difficulty: "medium",
  },
  {
    id: "invent-future",
    text: "The best way to predict the future is to invent it. The people who are crazy enough to think they can change the world are the ones who do.",
    difficulty: "medium",
  },
  {
    id: "twenty-years",
    text: "Twenty years from now you will be more disappointed by the things that you didn't do than by the ones you did do. So throw off the bowlines.",
    difficulty: "medium",
  },
  {
    id: "grandfather",
    text: "You wish to know all about my grandfather. Well, he is nearly ninety-three years old. He dresses himself in an ancient black frock coat, usually minus several buttons.",
    difficulty: "hard",
  },
  {
    id: "synchronized",
    text: "The synchronized swimming of the sequined performers shimmered shockingly under the spotlight, dazzling the discerning audience that thronged the theater.",
    difficulty: "hard",
  },
  {
    id: "synthesis",
    text: "Among the most magnificent achievements of modern science is the synthesis of organic compounds from inorganic materials through carefully calibrated chemical processes.",
    difficulty: "hard",
  },
  {
    id: "perceptual",
    text: "Particularly perplexing was the philosophical predicament posed by the prevailing paradigm of perceptual psychology, prompting profound personal reflection.",
    difficulty: "hard",
  },
  {
    id: "thirty-thieves",
    text: "The thirty-three thieves thought that they thrilled the throne throughout Thursday, but the throne thought that they thwarted them with thorough thinking.",
    difficulty: "hard",
  },
];
