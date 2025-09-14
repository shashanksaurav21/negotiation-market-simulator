import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import KpiCard from "../components/KpiCard";
import PriceLineChart from "../components/PriceLineChart";
import DealsBarChart from "../components/DealsBarChart";
import SurplusPie from "../components/SurplusPie";
import Histogram from "../components/Histogram";
import {
  BuyersTable,
  SellersTable,
  RoundSummary,
} from "../components/TopTables";
import { downloadJSON, downloadCSV } from "../utils/exports";

function safeNum(v) {
  return v === null || v === undefined ? 0 : Number(v);
}

function computeKpiDelta(a, b) {
  // returns { name, a, b, diff, pct } for a numeric KPI
  const A = safeNum(a),
    B = safeNum(b);
  const diff = B - A;
  const pct = A === 0 ? (B === 0 ? 0 : Infinity) : diff / Math.abs(A);
  return { a: A, b: B, diff, pct };
}

const extractMeta = (run) => {
  if (!run) return {};
  const sc = run.scenario || {};
  const params = sc.params || {};
  return {
    buyerStrategy:
      sc.negotiationStrategyBuyer || params.negotiationStrategyBuyer || "—",
    sellerStrategy:
      sc.negotiationStrategySeller || params.negotiationStrategySeller || "—",
    valDist: params.valuationDistribution || {},
    costDist: params.costDistribution || {},
    matching: params.matchingPolicy || sc.matchingPolicy || "—",
  };
};

export default function CompareResults() {
  const loc = useLocation();
  const nav = useNavigate();
  const state = loc.state || {};
  const runA = state.a || null;
  const runB = state.b || null;

  if (!runA || !runB) {
    return (
      <div className="space-y-4">
        <div className="bg-white p-6 rounded shadow">
          No runs selected for comparison.
        </div>
        <div>
          <button onClick={() => nav(-1)} className="px-3 py-2 border rounded">
            Back
          </button>
        </div>
      </div>
    );
  }

  // Prepare metrics
  const metricsA = runA.metrics || {};
  const metricsB = runB.metrics || {};

  const kpis = {
    tradeVolume: computeKpiDelta(metricsA.tradeVolume, metricsB.tradeVolume),
    avgPrice: computeKpiDelta(metricsA.averagePrice, metricsB.averagePrice),
    totalSurplus: computeKpiDelta(metricsA.totalSurplus, metricsB.totalSurplus),
    deadlockRate: computeKpiDelta(metricsA.deadlockRate, metricsB.deadlockRate),
    gini: computeKpiDelta(metricsA.giniSurplus, metricsB.giniSurplus),
    avgOffers: computeKpiDelta(
      metricsA.avgOffersToDeal,
      metricsB.avgOffersToDeal
    ),
  };

  // Prepare line data overlay: combine rounds up to max rounds
  const roundsA = runA.rounds || [];
  const roundsB = runB.rounds || [];
  const maxRounds = Math.max(roundsA.length, roundsB.length);
  const lineData = Array.from({ length: maxRounds }, (_, i) => {
    const a = roundsA[i];
    const b = roundsB[i];
    return {
      round: i + 1,
      avgA: a ? a.avgPrice ?? 0 : null,
      avgB: b ? b.avgPrice ?? 0 : null,
    };
  });
  console.log(lineData, "lineData");

  // Prepare bar data: deals/deadlocks overlay (we'll keep A and B as separate bars)
  const barData = Array.from({ length: maxRounds }, (_, i) => {
    const a = roundsA[i] || { deals: 0, deadlocks: 0 };
    const b = roundsB[i] || { deals: 0, deadlocks: 0 };
    return {
      round: i + 1,
      dealsA: a.deals || 0,
      deadlocksA: a.deadlocks || 0,
      dealsB: b.deals || 0,
      deadlocksB: b.deadlocks || 0,
    };
  });

  // Price distributions
  const pricesA = runA.allDealPrices || roundsA.flatMap((r) => r.prices || []);
  const pricesB = runB.allDealPrices || roundsB.flatMap((r) => r.prices || []);

  // Buyers/Sellers
  const buyersA = runA.buyers || [];
  const buyersB = runB.buyers || [];
  const sellersA = runA.sellers || [];
  const sellersB = runB.sellers || [];

  // Data for CSV export comparing rounds
  const compareRoundsCsvRows = barData.map((row) => ({
    round: row.round,
    dealsA: row.dealsA,
    deadlocksA: row.deadlocksA,
    dealsB: row.dealsB,
    deadlocksB: row.deadlocksB,
  }));

  // JSON for combined export
  const combinedExport = {
    a: runA,
    b: runB,
    comparison: { kpis, lineData, barData },
  };

  const metaA = extractMeta(runA);
  const metaB = extractMeta(runB);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Compare Runs</h2>
        <div className="space-x-2">
          <button
            onClick={() => downloadJSON(runA, `run-A.json`)}
            className="px-3 py-2 border rounded"
          >
            Export A
          </button>
          <button
            onClick={() => downloadJSON(runB, `run-B.json`)}
            className="px-3 py-2 border rounded"
          >
            Export B
          </button>
          <button
            onClick={() => downloadJSON(combinedExport, `compare-A-vs-B.json`)}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
          >
            Export Comparison
          </button>
        </div>
      </div>

      {/* --- Inserted: Scenario summary for both runs (Strategies, dists, matching) */}
      <div className="grid grid-cols-2 gap-4">
        {/* Run A meta */}
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Run A — Scenario</div>
          <div className="mt-2 text-sm space-y-2">
            <div>
              <div className="text-xs text-gray-400">Strategies</div>
              <div className="mt-1">
                <span className="inline-block mr-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                  Buyer: {metaA.buyerStrategy}
                </span>
                <span className="inline-block px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs">
                  Seller: {metaA.sellerStrategy}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400">
                Valuation distribution
              </div>
              <div className="mt-1 text-sm">
                {metaA.valDist?.type ? (
                  <>
                    <strong>{metaA.valDist.type}</strong>
                    {metaA.valDist.params && (
                      <span className="ml-2 text-xs text-gray-500">
                        {Object.entries(metaA.valDist.params)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400">Cost distribution</div>
              <div className="mt-1 text-sm">
                {metaA.costDist?.type ? (
                  <>
                    <strong>{metaA.costDist.type}</strong>
                    {metaA.costDist.params && (
                      <span className="ml-2 text-xs text-gray-500">
                        {Object.entries(metaA.costDist.params)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400">Matching policy</div>
              <div className="mt-1 text-sm">{metaA.matching}</div>
            </div>
          </div>
        </div>

        {/* Run B meta */}
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Run B — Scenario</div>
          <div className="mt-2 text-sm space-y-2">
            <div>
              <div className="text-xs text-gray-400">Strategies</div>
              <div className="mt-1">
                <span className="inline-block mr-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                  Buyer: {metaB.buyerStrategy}
                </span>
                <span className="inline-block px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs">
                  Seller: {metaB.sellerStrategy}
                </span>
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400">
                Valuation distribution
              </div>
              <div className="mt-1 text-sm">
                {metaB.valDist?.type ? (
                  <>
                    <strong>{metaB.valDist.type}</strong>
                    {metaB.valDist.params && (
                      <span className="ml-2 text-xs text-gray-500">
                        {Object.entries(metaB.valDist.params)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400">Cost distribution</div>
              <div className="mt-1 text-sm">
                {metaB.costDist?.type ? (
                  <>
                    <strong>{metaB.costDist.type}</strong>
                    {metaB.costDist.params && (
                      <span className="ml-2 text-xs text-gray-500">
                        {Object.entries(metaB.costDist.params)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-gray-400">Matching policy</div>
              <div className="mt-1 text-sm">{metaB.matching}</div>
            </div>
          </div>
        </div>
      </div>
      {/* --- end inserted */}

      {/* KPI cards side-by-side + delta */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Metric</div>
          <div className="mt-2 space-y-2">
            <div className="flex justify-between">
              <div className="text-sm">Trade Volume</div>
              <div className="font-semibold">
                {kpis.tradeVolume.a} → {kpis.tradeVolume.b}{" "}
                <span className="text-xs text-gray-500">
                  ({kpis.tradeVolume.diff >= 0 ? "+" : ""}
                  {kpis.tradeVolume.diff})
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm">Avg Price</div>
              <div className="font-semibold">
                {kpis.avgPrice.a?.toFixed?.(2) ?? kpis.avgPrice.a} →{" "}
                {kpis.avgPrice.b?.toFixed?.(2) ?? kpis.avgPrice.b}{" "}
                <span className="text-xs text-gray-500">
                  ({kpis.avgPrice.diff >= 0 ? "+" : ""}
                  {kpis.avgPrice.diff?.toFixed?.(2) ?? kpis.avgPrice.diff})
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm">Total Surplus</div>
              <div className="font-semibold">
                {kpis.totalSurplus.a?.toFixed?.(2) ?? kpis.totalSurplus.a} →{" "}
                {kpis.totalSurplus.b?.toFixed?.(2) ?? kpis.totalSurplus.b}{" "}
                <span className="text-xs text-gray-500">
                  ({kpis.totalSurplus.diff >= 0 ? "+" : ""}
                  {kpis.totalSurplus.diff?.toFixed?.(2) ??
                    kpis.totalSurplus.diff}
                  )
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm">Deadlock %</div>
              <div className="font-semibold">
                {(kpis.deadlockRate.a * 100).toFixed(1) ?? "—"}% →{" "}
                {(kpis.deadlockRate.b * 100).toFixed(1) ?? "—"}%{" "}
                <span className="text-xs text-gray-500">
                  ({(kpis.deadlockRate.diff * 100).toFixed(1) ?? "—"}%)
                </span>
              </div>
            </div>
            <div className="flex justify-between">
              <div className="text-sm">Gini</div>
              <div className="font-semibold">
                {kpis.gini.a?.toFixed?.(3) ?? kpis.gini.a} →{" "}
                {kpis.gini.b?.toFixed?.(3) ?? kpis.gini.b}{" "}
                <span className="text-xs text-gray-500">
                  ({kpis.gini.diff >= 0 ? "+" : ""}
                  {kpis.gini.diff?.toFixed?.(3) ?? kpis.gini.diff})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* A KPIs */}
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Run A</div>
          <div className="mt-2 space-y-2">
            <div className="text-2xl font-semibold">
              {metricsA.tradeVolume ?? "—"}
            </div>
            <div className="text-sm text-gray-500">
              Avg Price:{" "}
              {metricsA.averagePrice ? metricsA.averagePrice.toFixed(2) : "—"}
            </div>
            <div className="text-sm text-gray-500">
              Total Surplus: {metricsA.totalSurplus?.toFixed?.(2) ?? "—"}
            </div>
            <div className="text-sm text-gray-500">
              Deadlock %:{" "}
              {metricsA.deadlockRate
                ? (metricsA.deadlockRate * 100).toFixed(1) + "%"
                : "—"}
            </div>
          </div>
        </div>

        {/* B KPIs */}
        <div className="bg-white p-4 rounded shadow">
          <div className="text-sm text-gray-500">Run B</div>
          <div className="mt-2 space-y-2">
            <div className="text-2xl font-semibold">
              {metricsB.tradeVolume ?? "—"}
            </div>
            <div className="text-sm text-gray-500">
              Avg Price:{" "}
              {metricsB.averagePrice ? metricsB.averagePrice.toFixed(2) : "—"}
            </div>
            <div className="text-sm text-gray-500">
              Total Surplus: {metricsB.totalSurplus?.toFixed?.(2) ?? "—"}
            </div>
            <div className="text-sm text-gray-500">
              Deadlock %:{" "}
              {metricsB.deadlockRate
                ? (metricsB.deadlockRate * 100).toFixed(1) + "%"
                : "—"}
            </div>
          </div>
        </div>
      </div>

      {/* Avg Price per Round (A vs B */}
      <div className="">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-medium mb-2">Avg Price per Round (A vs B)</h3>
          <div style={{ width: "100%" }}>
            {/* reuse PriceLineChart by passing combined data with two keys avgA/avgB and customizing the component? 
                For simplicity we inline a quick Recharts LineChart here so it overlays both. */}
            {lineData && lineData.length > 0 && (
              <PriceLineChart
                data={lineData}
                series={[
                  { key: "avgA", name: "Run A", color: "#2563EB" },
                  { key: "avgB", name: "Run B", color: "#7C3AED" },
                ]}
              />
            )}
            <div className="text-xs text-gray-500 mt-2">
              Blue = A, Purple = B
            </div>
          </div>
        </div>
      </div>

      {/* Deals & Deadlocks (A vs B */}
      <div className="bg-white p-4 rounded shadow  ">
        <h3 className="font-medium mb-2">Deals & Deadlocks (A vs B)</h3>
        <div style={{ width: "100%" }} className="grid grid-cols-2 gap-4">
          {/* We'll transform barData into a format that DealsBarChart doesn't expect exactly.
                So we keep a minimal custom rendering by reusing the existing DealsBarChart for A only and B only side-by-side. */}
          <DealsBarChart
            data={barData.map((d) => ({
              round: d.round,
              deals: d.dealsA,
              deadlocks: d.deadlocksA,
            }))}
          />
          {/* <div className="mt-2 text-sm text-gray-500">
            Top: Run A. Scroll to compare Run B below.
          </div> */}
          <div className="mt-3">
            <DealsBarChart
              data={barData.map((d) => ({
                round: d.round,
                deals: d.dealsB,
                deadlocks: d.deadlocksB,
              }))}
            />
          </div>
        </div>
      </div>

      {/* Surplus pies and histograms */}
      <div className="bg-white p-4 rounded shadow  ">
        <h3 className="font-medium mb-2">Surplus Split Run (A vs B)</h3>
        <div style={{ width: "100%" }} className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 ">
            <SurplusPie
              consumer={metricsA.consumerSurplus}
              producer={metricsA.producerSurplus}
            />
          </div>
          <div className="bg-white p-4 ">
            {/* <h3 className="font-medium mb-2">Surplus Split — Run B</h3> */}
            <SurplusPie
              consumer={metricsB.consumerSurplus}
              producer={metricsB.producerSurplus}
            />
          </div>
        </div>
      </div>

      {/* Price Distribution */}
      <div className="bg-white p-4 rounded shadow  ">
        <h3 className="font-medium mb-2">Price Distribution Run (A vs B)</h3>
        <div style={{ width: "100%" }} className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4">
            <Histogram values={pricesA} />
          </div>
          <div className="bg-white p-4">
            <Histogram values={pricesB} />
          </div>
        </div>
      </div>

      {/* Top tables side-by-side */}

      <div className="bg-white p-4 rounded shadow">
        <div>
          <h3 className="font-medium mb-2">Top Buyers (A vs B)</h3>
          <div className="grid grid-cols-2 gap-4 ">
            <BuyersTable buyers={buyersA} />
            <BuyersTable buyers={buyersB} />
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow">
        <div>
          <h3 className="font-medium mb-2">Top Sellers (A vs B)</h3>
          <div className="grid grid-cols-2 gap-4 ">
            <SellersTable sellers={sellersA} />
            <SellersTable sellers={sellersB} />
          </div>
        </div>
      </div>

      {/* Per-round comparative table export */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-medium mb-2">Per-round comparison (A vs B)</h3>
        <table className="w-full text-sm mb-3">
          <thead>
            <tr>
              <th>Round</th>
              <th>A deals</th>
              <th>A deadlocks</th>
              <th>B deals</th>
              <th>B deadlocks</th>
            </tr>
          </thead>
          <tbody>
            {compareRoundsCsvRows.map((r) => (
              <tr key={r.round}>
                <td className="text-center">{r.round}</td>
                <td className="text-center">{r.dealsA}</td>
                <td className="text-center">{r.deadlocksA}</td>
                <td className="text-center">{r.dealsB}</td>
                <td className="text-center">{r.deadlocksB}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex space-x-2">
          <button
            onClick={() =>
              downloadCSV(compareRoundsCsvRows, "compare-rounds.csv")
            }
            className="px-3 py-2 border rounded"
          >
            Export rounds CSV
          </button>
        </div>
      </div>
    </div>
  );
}
