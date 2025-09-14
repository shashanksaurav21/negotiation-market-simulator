import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
function makeBins(values = [], bins = 25) {
  if (!values.length) return [];
  const min = Math.min(...values),
    max = Math.max(...values);
  const size = (max - min) / bins || 1;
  const out = Array.from({ length: bins }, (_, i) => ({
    name: `${Math.round(min + i * size)}-${Math.round(min + (i + 1) * size)}`,
    count: 0,
  }));
  values.forEach((v) => {
    let idx = Math.floor((v - min) / size);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    out[idx].count++;
  });
  return out;
}
export default function Histogram({ values }) {
  const data = makeBins(values, 25);
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h3 className="font-medium mb-2">Price Distribution</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" hide />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#60A5FA" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
