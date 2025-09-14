import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
const COLORS = ["#60A5FA", "#F59E0B"];
export default function SurplusPie({ consumer = 0, producer = 0 }) {
  const data = [
    { name: "Consumer", value: consumer },
    { name: "Producer", value: producer },
  ];
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h3 className="font-medium mb-2">Surplus Split</h3>
      <div style={{ width: "100%", height: 260 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={80}
              label
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
