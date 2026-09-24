import { useState } from "react";
import { chartMetrics } from "../demo/fixtures";
import Tabs from "./Tabs";

export default function UsageChart({ daily, totals }: {
  daily?: { day: string; requests: number; credits: string }[];
  totals?: { requests: number; credits: string };
}) {
  const [metric, setMetric] = useState<keyof typeof chartMetrics>("Requests");
  const values = daily?.map(day => metric === "Requests" ? day.requests : Number(day.credits));
  const observedMax = values ? Math.max(...values) || 1 : 1;
  // Request counts use whole-number ticks across the three grid intervals.
  const max = metric === 'Requests' ? Math.ceil(observedMax / 3) * 3 : observedMax;
  const data = values && totals ? {
    values, max, total: metric === "Requests" ? String(totals.requests) : totals.credits,
    unit: metric === "Requests" ? "requests" : "credits used",
    axis: [max, max * 2 / 3, max / 3, 0].map(value => value.toLocaleString("en-US", { maximumFractionDigits: 2 })),
  } : chartMetrics[metric];
  const labels = daily?.map(day => new Date(`${day.day}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" }))
    ?? ["Sep 10", "Sep 11", "Sep 12", "Sep 13", "Sep 14", "Sep 15", "Sep 16"];
  const points = data.values.map((value, index) => [
    index * 660 / Math.max(1, data.values.length - 1),
    180 - (value / data.max) * 180,
  ]);
  const line = points
    .map((point, index) => `${index ? "L" : "M"}${point.join(" ")}`)
    .join(" ");
  return (
    <section>
      <div className="section-title">
        <h2>Usage over time</h2>
        <Tabs
          label="Chart metric"
          options={["Requests", "Credits used"]}
          value={metric}
          onChange={setMetric}
          panelId="usage-chart"
        />
      </div>
      <div id="usage-chart" role="tabpanel" aria-label={metric} tabIndex={0}>
        <div className="chart-label">
          <strong>{data.total}</strong>
          <span>{data.unit}</span>
        </div>
        <div className="plot">
          <div className="axis" aria-hidden="true">
            {data.axis.map((value, index) => (
              <span key={index}>{value}</span>
            ))}
          </div>
          <svg
            viewBox="0 0 660 180"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Sample daily ${metric.toLowerCase()}, ${labels[0]} to ${labels.at(-1)}`}
          >
            <desc>
              {data.values
                .map((value, index) => `${labels[index]}: ${daily && metric === "Credits used" ? daily[index]!.credits : value}`)
                .join("; ")}
            </desc>
            <defs>
              <linearGradient id="chart-area" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#57C99B" stopOpacity=".09" />
                <stop offset="1" stopColor="#57C99B" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 0H660M0 60H660M0 120H660M0 180H660"
              stroke="#383838"
              strokeDasharray="3 5"
            />
            <path d={`${line} L660 180 L0 180Z`} fill="url(#chart-area)" />
            <path
              d={line}
              fill="none"
              stroke="#57C99B"
              strokeWidth="2.5"
              vectorEffect="non-scaling-stroke"
            />
            {points.map((point, index) => (
              <circle
                key={index}
                cx={point[0]}
                cy={point[1]}
                r="3"
                fill="#57C99B"
              >
                <title>
                  {`${labels[index]}: ${daily && metric === "Credits used" ? daily[index]!.credits : data.values[index]} ${metric.toLowerCase()}`}
                </title>
              </circle>
            ))}
          </svg>
        </div>
        <div className="dates" aria-hidden="true">
          {labels.filter((_, index) => index === 0 || index === labels.length - 1 || index % Math.ceil(labels.length / 7) === 0).map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="legend">
          <i className="dot" />
          <span>{metric === "Requests" ? "All requests" : metric}</span>
          <span>Daily totals · {daily ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"}</span>
        </div>
      </div>
    </section>
  );
}
