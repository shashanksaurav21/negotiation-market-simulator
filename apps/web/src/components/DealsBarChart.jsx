import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
export default function DealsBarChart({ data }) {
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h3 className="font-medium mb-2">Deals vs Deadlocks</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="round" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="deals" name="Deals" fill="#10B981" />
            <Bar dataKey="deadlocks" name="Deadlocks" fill="#EF4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
