"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

export type SpiderAxis = {
  axis: string;
  value: number;
};

type SpiderChartProps = {
  axes: SpiderAxis[];
  height?: number;
  className?: string;
};

export default function SpiderChart({ axes, height = 240, className }: SpiderChartProps) {
  return (
    <div
      className={`[&_.recharts-surface]:outline-none [&_.recharts-surface]:focus:outline-none ${className ?? ""}`}
    >
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={axes}>
          <PolarGrid stroke="rgba(148, 163, 184, 0.2)" />
          <PolarAngleAxis tick={{ fill: "#94a3b8", fontSize: 11 }} dataKey="axis" />
          <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="#0ea5e9"
            fill="#0ea5e9"
            fillOpacity={0.3}
            strokeWidth={2}
            dot={false}
            activeDot={(
              props: {
                cx?: number;
                cy?: number;
                payload?: { value?: number };
              }
            ) => {
              const { cx, cy, payload } = props;
              if (
                typeof cx !== "number" ||
                typeof cy !== "number" ||
                typeof payload?.value !== "number"
              ) {
                return null;
              }
              return (
                <g>
                  <circle cx={cx} cy={cy} r={4} fill="#0ea5e9" stroke="#e0f2fe" strokeWidth={1} />
                  <text
                    x={cx}
                    y={cy - 12}
                    textAnchor="middle"
                    fill="#e0f2fe"
                    fontSize={12}
                    fontWeight={600}
                  >
                    {Number(payload.value).toFixed(1)}
                  </text>
                </g>
              );
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
