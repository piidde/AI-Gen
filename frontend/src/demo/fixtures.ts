// Fictional display data only. These view shapes are not backend or billing contracts.
// Monetary/credit values stay display strings; the frontend performs no accounting.
export const summary = {
  balance: "842.60",
  used: "128.40",
  requests: "12,480",
  completed: "99.77%",
  failed: "29",
  period: "Sep 10 – 16, 2026",
};
export const requests = [
  {
    time: "14:32:08",
    model: "A",
    key: "Production",
    status: "Completed",
    id: "req_8f21",
    credits: "0.012",
  },
  {
    time: "14:31:52",
    model: "B",
    key: "Internal tools",
    status: "Completed",
    id: "req_3b74",
    credits: "0.024",
  },
  {
    time: "14:30:16",
    model: "A",
    key: "Production",
    status: "Failed",
    id: "req_9c10",
    credits: "—",
  },
  {
    time: "14:29:41",
    model: "A",
    key: "Production",
    status: "Completed",
    id: "req_4e62",
    credits: "0.016",
  },
  {
    time: "14:28:30",
    model: "B",
    key: "Internal tools",
    status: "Completed",
    id: "req_1d83",
    credits: "0.020",
  },
] as const;
export const chartMetrics = {
  Requests: {
    values: [980, 1520, 1240, 2130, 1710, 2780, 2120],
    max: 3000,
    total: "12,480",
    unit: "requests in this period",
    axis: ["3,000", "2,000", "1,000", "0"],
  },
  "Credits used": {
    values: [9.8, 14.2, 12.4, 22.6, 18.7, 28.5, 22.2],
    max: 30,
    total: "128.40",
    unit: "credits used in this period",
    axis: ["30", "20", "10", "0"],
  },
} as const;
export const apiKeys = [
  {
    name: "Production",
    suffix: "8f21",
    status: "Active",
    created: "Sep 08, 2026",
    lastUsed: "2 minutes ago",
  },
  {
    name: "Internal tools",
    suffix: "3b74",
    status: "Active",
    created: "Sep 10, 2026",
    lastUsed: "18 minutes ago",
  },
  {
    name: "Old integration",
    suffix: "1c09",
    status: "Revoked",
    created: "Aug 28, 2026",
    lastUsed: "Sep 02, 2026",
  },
] as const;
export const payments = [
  {
    date: "Sep 16, 2026",
    id: "order_1032",
    status: "Pending",
    amount: "€25.00",
  },
  { date: "Sep 12, 2026", id: "order_1028", status: "Paid", amount: "€50.00" },
  {
    date: "Sep 08, 2026",
    id: "order_1021",
    status: "Failed",
    amount: "€25.00",
  },
  { date: "Sep 01, 2026", id: "order_1007", status: "Paid", amount: "€50.00" },
] as const;
export const models = [
  {
    id: "openai-text-example",
    provider: "OpenAI",
    name: "OpenAI text model",
    capability: "Text",
    description:
      "Text generation for your applications and automated workflows.",
    rates: ["$0.40", "$1.60"],
  },
  {
    id: "gemini-text-example",
    provider: "Gemini",
    name: "Gemini text model",
    capability: "Text",
    description: "Text generation through your existing API integrations.",
    rates: ["$0.25", "$1.00"],
  },
  {
    id: "openai-image-example",
    provider: "OpenAI",
    name: "OpenAI image model",
    capability: "Image",
    description: "Image generation for visual content and creative workflows.",
    rates: ["$0.02"],
  },
  {
    id: "gemini-image-example",
    provider: "Gemini",
    name: "Gemini image model",
    capability: "Image",
    description: "Image generation with model-specific output options.",
    rates: ["$0.03"],
  },
] as const;
export const profile = {
  name: "Sample account",
  email: "builder@example.com",
  productUpdates: true,
  documentationUpdates: false,
};
