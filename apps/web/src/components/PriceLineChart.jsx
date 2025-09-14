// src/components/PriceLineChart.jsx
import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

/**
 * PriceLineChart
 * Props:
 *  - data: array of objects like { round: 1, avgPrice: 10, avgA: 12, avgB: 9 }
 *  - series: optional array describing series to plot:
 *      [{ key: 'avgPrice', name: 'Avg Price', color: '#4F46E5' }, ...]
 *    If omitted, component will try to auto-detect a single series:
 *      'avgPrice' OR the first numeric key found (excluding 'round').
 *  - height: optional chart height (default 260)
 */
export default function PriceLineChart({
  data = [],
  series = null,
  height = 260,
}) {
  // infer series if not provided
  const inferredSeries = React.useMemo(() => {
    if (Array.isArray(series) && series.length > 0) return series;

    if (!data || data.length === 0)
      return [{ key: "avgPrice", name: "Avg Price", color: "#4F46E5" }];

    // find candidate keys from the first datum (except 'round' and non-numeric)
    const first = data[0];
    const candidates = Object.keys(first).filter(
      (k) => k !== "round" && typeof first[k] === "number"
    );
    if (candidates.length === 0) {
      // fallback to avgPrice
      return [{ key: "avgPrice", name: "Avg Price", color: "#4F46E5" }];
    }
    // pick up to 2-3 candidates by default
    const palette = ["#2563EB", "#7C3AED", "#10B981", "#F59E0B", "#EF4444"];
    return candidates.slice(0, 3).map((k, i) => ({
      key: k,
      name: k,
      color: palette[i % palette.length],
    }));
  }, [series, data]);

  // Prepare tooltip formatter: show value to 2 decimals if numeric
  const tooltipFormatter = (value, name) => {
    if (value === null || value === undefined) return ["—", name];
    if (typeof value === "number") return [Number(value).toFixed(2), name];
    return [value, name];
  };

  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h3 className="font-medium mb-2">Avg Price per Round</h3>
      <div style={{ width: "100%", height }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="round" />
            <YAxis />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            {inferredSeries.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                connectNulls={false} // breaks line on nulls
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
