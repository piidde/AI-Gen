import { useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { chartMetrics } from "../demo/fixtures";
import Tabs from "./Tabs";
import "./UsageChart.css";

type Metric = keyof typeof chartMetrics;
type Point = { x: number; y: number };

// Cubic Hermite tangents flatten at extrema, so the curve cannot overshoot a daily value.
function smoothPath(points: Point[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0]!.x} ${points[0]!.y}`;
  const slopes = points.slice(1).map((point, index) =>
    (point.y - points[index]!.y) / (point.x - points[index]!.x));
  const tangents = points.map((_, index) => {
    if (index === 0) return slopes[0]!;
    if (index === points.length - 1) return slopes.at(-1)!;
    const previous = slopes[index - 1]!;
    const next = slopes[index]!;
    return previous * next <= 0 ? 0 : 2 * previous * next / (previous + next);
  });
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index]!;
    const third = (point.x - previous.x) / 3;
    return `${path} C${previous.x + third} ${previous.y + tangents[index]! * third} ${point.x - third} ${point.y - tangents[index + 1]! * third} ${point.x} ${point.y}`;
  }, `M${points[0]!.x} ${points[0]!.y}`);
}

export default function UsageChart({ daily, totals, granularity = "day" }: {
  granularity?: "day" | "month";
  daily?: { day: string; requests: number; credits: string }[];
  totals?: { requests: number; credits: string };
}) {
  const [metric, setMetric] = useState<Metric>("Requests");
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradientId = useId().replaceAll(":", "");
  const values = daily?.map(day => metric === "Requests" ? day.requests : Number(day.credits));
  const observedMax = values ? Math.max(...values) || 1 : 1;
  const max = metric === "Requests" ? Math.ceil(observedMax / 3) * 3 : observedMax;
  const data = values && totals ? {
    values, max, total: metric === "Requests" ? String(totals.requests) : totals.credits,
    unit: metric === "Requests" ? "requests" : "credits used",
    axis: [max, max * 2 / 3, max / 3, 0].map(value => value.toLocaleString("en-US", { maximumFractionDigits: 2 })),
  } : chartMetrics[metric];
  const labels = daily?.map(day => new Date(`${day.day}T12:00:00`).toLocaleDateString("en", granularity === "month" ? { month: "short", year: "2-digit" } : { month: "short", day: "numeric" }))
    ?? ["Sep 10", "Sep 11", "Sep 12", "Sep 13", "Sep 14", "Sep 15", "Sep 16"];
  const points = data.values.map((value, index) => ({
    x: index * 660 / Math.max(1, data.values.length - 1),
    y: 180 - (value / data.max) * 180,
  }));
  const line = smoothPath(points);
  const active = activeIndex === null ? null : points[activeIndex] ?? null;
  const activeValue = activeIndex === null ? null : daily && metric === "Credits used"
    ? daily[activeIndex]?.credits : data.values[activeIndex]?.toLocaleString("en-US");
  const dailyUnit = metric === "Requests" ? "requests" : "credits used";
  const activeLabel = active ? `${labels[activeIndex!]}: ${activeValue} ${dailyUnit}` : "";

  const selectPointerDay = (event: PointerEvent<SVGSVGElement>) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds?.width || !points.length) return;
    const fraction = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    setActiveIndex(Math.round(fraction * (points.length - 1)));
  };
  const selectKeyboardDay = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!points.length) return;
    let next: number;
    if (event.key === "ArrowRight") next = Math.min(points.length - 1, (activeIndex ?? -1) + 1);
    else if (event.key === "ArrowLeft") next = Math.max(0, (activeIndex ?? points.length) - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = points.length - 1;
    else if (event.key === "Escape") { setActiveIndex(null); return; }
    else return;
    event.preventDefault();
    setActiveIndex(next);
  };

  return (
    <section className="usage-chart">
      <div className="section-title">
        <h2>Usage over time</h2>
        <Tabs label="Chart metric" options={["Requests", "Credits used"]}
          value={metric} onChange={setMetric} panelId="usage-chart" />
      </div>
      <div id="usage-chart" role="tabpanel" aria-label={metric} tabIndex={0}>
        <div className="chart-label"><strong>{data.total}</strong><span>{data.unit}</span></div>
        <div className="plot">
          <div className="axis" aria-hidden="true">
            {data.axis.map((value, index) => <span key={index}>{value}</span>)}
          </div>
          <div className="usage-chart__canvas">
            <svg ref={svgRef} viewBox="0 0 660 180" preserveAspectRatio="none"
              role="img" tabIndex={0}
              aria-label={`Sample ${granularity === "month" ? "monthly" : "daily"} ${metric.toLowerCase()}, ${labels[0]} to ${labels.at(-1)}. Use arrow keys to inspect period values.`}
              onPointerMove={selectPointerDay} onPointerDown={selectPointerDay}
              onPointerLeave={event => { if (event.pointerType !== "touch") setActiveIndex(null); }}
              onBlur={() => setActiveIndex(null)}
              onKeyDown={selectKeyboardDay}>
              <desc>{data.values.map((value, index) => `${labels[index]}: ${daily && metric === "Credits used" ? daily[index]!.credits : value}`).join("; ")}</desc>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#57C99B" stopOpacity=".17" />
                  <stop offset="1" stopColor="#57C99B" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M0 0H660M0 60H660M0 120H660M0 180H660"
                stroke="#434a47" strokeWidth="1" strokeDasharray="2 6" vectorEffect="non-scaling-stroke" />
              {line && <path d={`${line} L${points.at(-1)!.x} 180 L0 180Z`} fill={`url(#${gradientId})`} />}
              <path d={line} fill="none" stroke="#57C99B" strokeWidth="2.5"
                strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              {active && <>
                <path d={`M${active.x} 0V180`} className="usage-chart__guide" vectorEffect="non-scaling-stroke" />
                <circle cx={active.x} cy={active.y} r="5" className="usage-chart__active-point" vectorEffect="non-scaling-stroke" />
              </>}
            </svg>
            {active && <div className="usage-chart__tooltip"
              style={{
                left: `clamp(0px, calc(${active.x / 660 * 100}% - 80px), calc(100% - 160px))`,
                top: `${active.y / 180 * 100}%`,
                transform: "translateY(calc(-100% - 12px))",
              }}
              aria-hidden="true">
              <span>{labels[activeIndex!]}</span><strong>{activeValue} {dailyUnit}</strong>
            </div>}
          </div>
        </div>
        <div className="dates" aria-hidden="true">
          {labels.filter((_, index) => index === 0 || index === labels.length - 1 || index % Math.ceil(labels.length / 7) === 0)
            .map(day => <span key={day}>{day}</span>)}
        </div>
        <div className="legend">
          <i className="dot" />
          <span>{metric === "Requests" ? "All requests" : metric}</span>
          <span>{granularity === "month" ? "Monthly" : "Daily"} totals · {daily ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC"}</span>
        </div>
        <span className="usage-chart__sr-only" role="status" aria-live="polite">{activeLabel}</span>
      </div>
    </section>
  );
}
