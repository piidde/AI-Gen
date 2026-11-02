// Homepage FAQ. The visible list and the FAQPage structured data both read
// this, so the markup can never describe answers the page does not show.

export type FaqSegment = string | { to: string; label: string };

export type FaqEntry = { question: string; answer: FaqSegment[] };

export const homeFaq: FaqEntry[] = [
  {
    question: "Can I generate images or text on this website?",
    answer: ["Generation is API-only. You use your own application or API client; this website manages your account, keys, billing and usage."],
  },
  {
    question: "How much can I save?",
    answer: ["Our cards show savings against the stated official price reference. For images, check the size and quality in the comparison note. Your total depends on the model, settings and any additional input or thinking usage."],
  },
  {
    question: "Are failed requests always refunded?",
    answer: ["Credits are restored for a failed request only when there is no upstream cost. A billed policy rejection stays charged. If a result is uncertain, inspect the request status before retrying."],
  },
  {
    question: "Do I need a subscription?",
    answer: ["No. Use prepaid credits across image and text models, with no monthly subscription. Credits never expire."],
  },
  {
    question: "Does it work with the OpenAI SDK?",
    answer: [
      "Yes. The API is OpenAI-compatible: set the base URL to https://aiapi.deals/v1, use your AIAPI.deals key and keep your code. Chat completions and the Responses API work as usual, and images run as asynchronous jobs. The ",
      { to: "/docs", label: "quickstart" }, " shows each request.",
    ],
  },
  {
    question: "How do I keep my API costs under control?",
    answer: ["You pay in advance, so you never spend more than your balance. When your credits run out, requests stop with insufficient_credits instead of running up a bill. You can switch on an email alert for a low balance, and your dashboard lists every request with its cost."],
  },
  {
    question: "Where can I check availability or get help?",
    answer: [
      "See ", { to: "/status", label: "service status" }, ", ", { to: "/support", label: "support guidance" },
      " and the ", { to: "/docs", label: "API documentation" }, ". An unavailable status source does not mean the service is healthy.",
    ],
  },
];

export function faqAnswerText(entry: FaqEntry): string {
  return entry.answer.map(segment => typeof segment === "string" ? segment : segment.label).join("");
}
