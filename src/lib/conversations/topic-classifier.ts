export const TOPIC_LABELS = [
  "Greeting / Small Talk",
  "Booking / Reservation / Appointment",
  "Availability / Hours / Location",
  "Pricing / Fees / Quotes",
  "Order Status / ETA",
  "Cancellation / Reschedule / Refunds",
  "Complaint / Dissatisfaction",
  "Product / Service Inquiry",
  "Payment Issues",
  "Resolved Issue",
  "Needs Human",
  "Needs Immediate Attention",
  "General Inquiry",
] as const;

export type ConversationTopic = (typeof TOPIC_LABELS)[number];

type KeywordRule = {
  phrase: string;
  weight: number;
};

const TOPIC_KEYWORDS: Record<ConversationTopic, KeywordRule[]> = {
  "Greeting / Small Talk": [
    { phrase: "hi", weight: 0.5 },
    { phrase: "hello", weight: 0.5 },
    { phrase: "hey", weight: 0.5 },
    { phrase: "good morning", weight: 0.5 },
    { phrase: "good afternoon", weight: 0.5 },
    { phrase: "good evening", weight: 0.5 },
    { phrase: "thanks", weight: 0.5 },
    { phrase: "thank you", weight: 0.5 },
    { phrase: "ok", weight: 0.5 },
    { phrase: "okay", weight: 0.5 },
    { phrase: "cool", weight: 0.5 },
  ],
  "Booking / Reservation / Appointment": [
    { phrase: "book", weight: 2 },
    { phrase: "booking", weight: 2 },
    { phrase: "appointment", weight: 2 },
    { phrase: "reserve", weight: 2 },
    { phrase: "reservation", weight: 2 },
    { phrase: "schedule", weight: 2 },
    { phrase: "scheduled", weight: 2 },
    { phrase: "reschedule", weight: 2 },
    { phrase: "availability", weight: 1 },
    { phrase: "slot", weight: 1.5 },
    { phrase: "time slot", weight: 1.5 },
    { phrase: "table", weight: 1.5 },
    { phrase: "party", weight: 1 },
    { phrase: "booking request", weight: 2 },
  ],
  "Availability / Hours / Location": [
    { phrase: "hours", weight: 1.5 },
    { phrase: "open", weight: 1.5 },
    { phrase: "opening hours", weight: 2 },
    { phrase: "close", weight: 1.5 },
    { phrase: "closing", weight: 1.5 },
    { phrase: "location", weight: 2 },
    { phrase: "address", weight: 2 },
    { phrase: "directions", weight: 2 },
    { phrase: "where are you", weight: 2 },
    { phrase: "parking", weight: 1.5 },
    { phrase: "open today", weight: 1.5 },
    { phrase: "closed", weight: 1.5 },
    { phrase: "holiday hours", weight: 2 },
  ],
  "Pricing / Fees / Quotes": [
    { phrase: "price", weight: 1.5 },
    { phrase: "pricing", weight: 1.5 },
    { phrase: "cost", weight: 1.5 },
    { phrase: "fee", weight: 1.5 },
    { phrase: "fees", weight: 1.5 },
    { phrase: "quote", weight: 1.5 },
    { phrase: "estimate", weight: 1.5 },
    { phrase: "rates", weight: 1.5 },
    { phrase: "charges", weight: 1.5 },
    { phrase: "how much", weight: 1.5 },
  ],
  "Order Status / ETA": [
    { phrase: "order", weight: 2 },
    { phrase: "status", weight: 1.5 },
    { phrase: "eta", weight: 2 },
    { phrase: "delivery", weight: 2 },
    { phrase: "pickup", weight: 2 },
    { phrase: "ready", weight: 1.5 },
    { phrase: "on the way", weight: 2 },
    { phrase: "tracking", weight: 2 },
    { phrase: "when will it arrive", weight: 2 },
    { phrase: "wait time", weight: 1.5 },
  ],
  "Cancellation / Reschedule / Refunds": [
    { phrase: "cancel", weight: 2 },
    { phrase: "cancellation", weight: 2 },
    { phrase: "reschedule", weight: 2 },
    { phrase: "postpone", weight: 2 },
    { phrase: "change appointment", weight: 2 },
    { phrase: "refund", weight: 2 },
    { phrase: "money back", weight: 2 },
    { phrase: "return", weight: 1.5 },
    { phrase: "return policy", weight: 1.5 },
  ],
  "Complaint / Dissatisfaction": [
    { phrase: "unhappy", weight: 2 },
    { phrase: "disappointed", weight: 2 },
    { phrase: "dissatisfied", weight: 2 },
    { phrase: "frustrated", weight: 2 },
    { phrase: "upset", weight: 2 },
    { phrase: "terrible", weight: 2 },
    { phrase: "horrible", weight: 2 },
    { phrase: "awful", weight: 2 },
    { phrase: "bad service", weight: 2 },
    { phrase: "bad experience", weight: 2 },
    { phrase: "not satisfied", weight: 2 },
    { phrase: "angry", weight: 2 },
    { phrase: "pissed", weight: 2 },
    { phrase: "this sucks", weight: 2 },
    { phrase: "worst", weight: 2 },
    { phrase: "not acceptable", weight: 2 },
    { phrase: "unacceptable", weight: 2 },
    { phrase: "never coming back", weight: 2 },
    { phrase: "won't return", weight: 2 },
    { phrase: "wont return", weight: 2 },
    { phrase: "you messed up", weight: 2 },
    { phrase: "you screwed up", weight: 2 },
    { phrase: "complaint", weight: 2 },
    { phrase: "complain", weight: 2 },
    { phrase: "rude", weight: 2 },
    { phrase: "not happy", weight: 2 },
  ],
  "Product / Service Inquiry": [
    { phrase: "service", weight: 1.5 },
    { phrase: "services", weight: 1.5 },
    { phrase: "menu", weight: 1.5 },
    { phrase: "offerings", weight: 1.5 },
    { phrase: "treatment", weight: 1.5 },
    { phrase: "procedure", weight: 1.5 },
    { phrase: "options", weight: 1.5 },
    { phrase: "do you have", weight: 1.5 },
    { phrase: "do you offer", weight: 1.5 },
    { phrase: "can you do", weight: 1.5 },
  ],
  "Payment Issues": [
    { phrase: "payment failed", weight: 2 },
    { phrase: "card declined", weight: 2 },
    { phrase: "charge failed", weight: 2 },
    { phrase: "charged twice", weight: 2 },
    { phrase: "incorrect charge", weight: 2 },
    { phrase: "refund status", weight: 2 },
    { phrase: "payment issue", weight: 2 },
    { phrase: "payment problem", weight: 2 },
  ],
  "Resolved Issue": [],
  "Needs Human": [],
  "Needs Immediate Attention": [],
  "General Inquiry": [],
};

const GREETING_TOPIC: ConversationTopic = "Greeting / Small Talk";
const GENERAL_TOPIC: ConversationTopic = "General Inquiry";

const SCORE_THRESHOLD = 1.5;

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const matchesKeyword = (text: string, phrase: string) => {
  if (phrase.includes(" ")) {
    return text.includes(phrase);
  }
  const regex = new RegExp(`\\b${escapeRegex(phrase)}\\b`, "i");
  return regex.test(text);
};

export function classifyConversationTopic({
  messages,
  totalUserMessages,
}: {
  messages: string[];
  totalUserMessages: number;
}): { topic: ConversationTopic; score: number } {
  const normalized = normalizeText(messages.join(" "));
  const scores = new Map<ConversationTopic, number>();

  for (const topic of TOPIC_LABELS) {
    const rules = TOPIC_KEYWORDS[topic];
    let score = 0;
    for (const rule of rules) {
      if (matchesKeyword(normalized, rule.phrase)) {
        score += rule.weight;
      }
    }
    scores.set(topic, score);
  }

  const greetingScore = scores.get(GREETING_TOPIC) ?? 0;
  let bestTopic: ConversationTopic = GENERAL_TOPIC;
  let bestScore = 0;

  for (const [topic, score] of scores.entries()) {
    if (topic === GREETING_TOPIC) {
      continue;
    }
    if (score > bestScore) {
      bestScore = score;
      bestTopic = topic;
    }
  }

  if (totalUserMessages < 2 && greetingScore > 0 && bestScore === 0) {
    return { topic: GREETING_TOPIC, score: greetingScore };
  }

  if (totalUserMessages >= 2 && bestScore === 0 && greetingScore > 0) {
    return { topic: GREETING_TOPIC, score: greetingScore };
  }

  if (bestScore < SCORE_THRESHOLD) {
    return { topic: GENERAL_TOPIC, score: bestScore };
  }

  return { topic: bestTopic, score: bestScore };
}
