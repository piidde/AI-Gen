import { useState } from "react";
import { chartMetrics } from "../demo/fixtures";
import Tabs from "./Tabs";

export default function UsageChart() {
  const [metric, setMetric] = useState<keyof typeof chartMetrics>("Requests");
  const data = chartMetrics[metric];
  const points = data.values.map((value, index) => [
    index * 110,
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
            {data.axis.map((value) => (
              <span key={value}>{value}</span>
            ))}
          </div>
          <svg
            viewBox="0 0 660 180"
            preserveAspectRatio="none"
            role="img"
            aria-label={`Sample daily ${metric.toLowerCase()}, September 10 to 16`}
          >
            <desc>
              {data.values
                .map((value, index) => `September ${index + 10}: ${value}`)
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
                  Sep {index + 10}: {data.values[index]} {metric.toLowerCase()}
                </title>
              </circle>
            ))}
          </svg>
        </div>
        <div className="dates" aria-hidden="true">
          {["Sep 10", "11", "12", "13", "14", "15", "16"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="legend">
          <i className="dot" />
          <span>{metric === "Requests" ? "All requests" : metric}</span>
          <span>Daily totals · UTC</span>
        </div>
      </div>
    </section>
  );
}
