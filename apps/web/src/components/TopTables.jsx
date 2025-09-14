export function BuyersTable({ buyers = [] }) {
  console.log(buyers, "buyers");
  const top = [...buyers]
    .sort((a, b) => (b.realizedSurplus || 0) - (a.realizedSurplus || 0))
    .slice(0, 10);
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h3 className="font-medium mb-2">Top 10 Buyers</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Valuation</th>
            <th>Surplus</th>
          </tr>
        </thead>
        <tbody>
          {top.map((b) => (
            <tr key={b.id}>
              <td className="text-center">{b.id}</td>
              <td className="text-center">{(b.valuation || 0).toFixed(2)}</td>
              <td className="text-center">
                {(b.realizedSurplus || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SellersTable({ sellers = [] }) {
  const top = [...sellers]
    .sort((a, b) => (b.realizedSurplus || 0) - (a.realizedSurplus || 0))
    .slice(0, 10);
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h3 className="font-medium mb-2">Top 10 Sellers</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>ID</th>
            <th>Cost</th>
            <th>Surplus</th>
          </tr>
        </thead>
        <tbody>
          {top.map((s) => (
            <tr key={s.id}>
              <td className="text-center">{s.id}</td>
              <td className="text-center">{(s.cost || 0).toFixed(2)}</td>
              <td className="text-center">
                {(s.realizedSurplus || 0).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RoundSummary({ rounds = [] }) {
  return (
    <div className="bg-white p-4 rounded shadow-sm">
      <h3 className="font-medium mb-2">Per-round summary</h3>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th>Round</th>
            <th>Deals</th>
            <th>Deadlocks</th>
            <th>Avg Price</th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((r) => (
            <tr key={r.roundNum}>
              <td className="text-center">{r.roundNum}</td>
              <td className="text-center">{r.deals}</td>
              <td className="text-center">{r.deadlocks}</td>
              <td className="text-center">
                {r.avgPrice ? r.avgPrice.toFixed(2) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
