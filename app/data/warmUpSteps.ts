export type WarmUpStep = {
  id: string;
  sectionTitle: string;
  stepTitle: string;
  instructions: string[];
  durationSeconds: number;
  notes?: string;
};

export const WARM_UP_STEPS: WarmUpStep[] = [
  {
    id: "shoulder-jaw",
    sectionTitle: "Physical & Breath Warm-Up",
    stepTitle: "Shoulder & Jaw Loosening",
    instructions: [
      "Roll your shoulders forward and back (20 seconds each way).",
      "Gently massage your cheeks and jaw.",
      "Do a few fake yawns to stretch your throat.",
      'Say "Ahhhhhh" on a sigh 3 times to warm up the vocal cords.',
    ],
    durationSeconds: 60,
  },
  {
    id: "breath-control",
    sectionTitle: "Physical & Breath Warm-Up",
    stepTitle: "Breath Control",
    instructions: [
      "Inhale deeply through your nose for 4 seconds.",
      'Exhale slowly through your mouth on an "sssssss" sound for 8-12 seconds.',
      "Repeat 3 times.",
      'Then say "Ha-Ha-Ha-Ha" sharply from your diaphragm. Repeat 3 times.',
    ],
    durationSeconds: 60,
  },
  {
    id: "tongue-twisters",
    sectionTitle: "Articulation & Diction Drills",
    stepTitle: "Tongue Twisters",
    instructions: [
      "Repeat each of these 10 twisters 3 times. Focus on clarity first, then speed.",
      "The lips, the teeth, the tip of the tongue",
      "Red leather, yellow leather",
      "Unique New York",
      "Toy boat, toy boat, toy boat",
      "Irish wristwatch, Swiss wristwatch",
      "The big black bug bit the big black bear",
      "She sells sea shells by the sea shore",
      "A proper copper coffee pot",
      "Truly rural",
      "Pad kid poured curd pulled cold",
    ],
    durationSeconds: 180,
    notes: "For scored twister practice, use Tongue Twisters mode.",
  },
  {
    id: "humming-resonance",
    sectionTitle: "Vocal Resonance & Projection",
    stepTitle: "Humming Resonance",
    instructions: [
      'Hum "mmm" and feel the vibrations in your nose and face.',
      'Then open into "maaa", "meee", "mooo".',
      'On a single breath: "Mmm-Maa-Mee-Moo-Maa-Mee-Moo".',
      "Repeat 5 times.",
    ],
    durationSeconds: 60,
  },
  {
    id: "projection",
    sectionTitle: "Vocal Resonance & Projection",
    stepTitle: "Projection Practice",
    instructions: [
      "Stand tall.",
      'Say loudly but not shouting: "I have something important to say."',
      'Then: "Every word matters."',
      'Then: "I speak with confidence and clarity."',
      "Repeat each line 3 times, increasing strength and clarity each time.",
    ],
    durationSeconds: 60,
  },
  {
    id: "read-aloud",
    sectionTitle: "Speaking Flow Drill",
    stepTitle: "Read Aloud",
    instructions: [
      "Pick a paragraph from a book, article, or script.",
      "Read it slowly with clear articulation.",
      "Read it again with more expression and confidence.",
    ],
    durationSeconds: 90,
  },
  {
    id: "freestyle",
    sectionTitle: "Speaking Flow Drill",
    stepTitle: "30-Second Freestyle Talks",
    instructions: [
      "Pick a topic and talk for 30 seconds nonstop. Do 3 topics total.",
      "Suggested topics: What I did yesterday • My favorite meal • A random object on my desk • Why mornings are hard • What makes a good speaker.",
      'Try to eliminate filler words ("like", "um").',
    ],
    durationSeconds: 90,
    notes: "For full scored impromptu speaking, use Off The Cuff mode.",
  },
];

export const TOTAL_WARM_UP_SECONDS = WARM_UP_STEPS.reduce(
  (sum, step) => sum + step.durationSeconds,
  0
);
