const paths = {
  overview: "M3 10 10 4l7 6v7H3Z",
  models: "M3 3h14v14H3ZM3 10h14M10 3v14",
  usage: "M4 15V9m6 6V5m6 10V2M2 18h16",
  billing: "M2 5h16v11H2ZM2 9h16",
  keys: "M9 10a4 4 0 1 1 2-4h7m-3 0v4",
  settings:
    "M10 2v3m0 10v3M2 10h3m10 0h3M4 4l2 2m8 8 2 2M4 16l2-2m8-8 2-2M14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  wallet: "M3 7V5l11-2v2M3 5h14v11H3Zm10 5h4v3h-4Z",
  requests: "M3 6h13m-3-3 3 3-3 3M17 14H4m3-3-3 3 3 3",
  check: "m4 10 4 4 8-9",
  text: "M4 4h12M10 4v12M7 16h6",
  image: "M3 3h14v14H3ZM4 15l5-5 3 3 2-2 3 3M6 6h2v2H6Z",
  profile: "M13 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0M3 18v-2a7 7 0 0 1 14 0v2",
  bell: "M4 14h12l-2-3V7a4 4 0 0 0-8 0v4ZM8 17h4",
} as const;

export type IconName = keyof typeof paths;
export default function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 20 20" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
export function MetricIcon({ name }: { name: IconName }) {
  return (
    <span className="metric-icon">
      <Icon name={name} />
    </span>
  );
}
