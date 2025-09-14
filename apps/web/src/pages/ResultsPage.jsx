import React, { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import api from "../api/client";
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

export default function ResultsPage() {
  const { runId } = useParams();
  const loc = useLocation();
  const passed = loc.state?.result;
  const [result, setResult] = useState(passed ?? null);
  const [meta, setMeta] = useState(passed ?? null);
  const [loading, setLoading] = useState(!passed);

  useEffect(() => {
    if (!result) {
      (async () => {
        try {
          setLoading(true);
          const res = await api.get(`/simulations/${runId}`);
          console.log(res, "ressss");
          setResult({
            metrics: res.data.metrics,
            rounds: res.data.rounds,
            buyers: res.data.buyers || res.data?.topBuyers || [],
            sellers: res.data.sellers || res.data?.topBuyers || [],
            allDealPrices: res.data.rounds.flatMap((r) => r.prices || []),
          });
          const metaData = extractMeta(res.data);
          console.log(metaData, "dataaaaaaaaaa");
          setMeta(metaData);
        } catch (err) {
          alert("Failed to fetch run: " + (err?.message || err));
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!result) return <div>No result found</div>;

  const metrics = result.metrics || {};
  const rounds = result.rounds || [];
  const buyers = result.buyers || [];
  const sellers = result.sellers || [];
  const allPrices =
    result.allDealPrices || rounds.flatMap((r) => r.prices || []);

  const lineData = rounds.map((r) => ({
    round: r.roundNum,
    avgPrice: r.avgPrice || 0,
  }));
  const barData = rounds.map((r) => ({
    round: r.roundNum,
    deals: r.deals,
    deadlocks: r.deadlocks,
  }));

  return (
    <div className="space-y-6">
      <div className="">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded shadow w-full">
            <div className="text-sm text-gray-500">Run A — Scenario</div>
            <div className="mt-2 text-sm space-y-2">
              <div>
                <div className="text-xs text-gray-400">Strategies</div>
                <div className="mt-1">
                  <span className="inline-block mr-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                    Buyer: {meta.buyerStrategy}
                  </span>
                  <span className="inline-block px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs">
                    Seller: {meta.sellerStrategy}
                  </span>
                </div>
              </div>

              <div>
                <div className="text-xs text-gray-400">
                  Valuation distribution
                </div>
                <div className="mt-1 text-sm">
                  {meta.valDist?.type ? (
                    <>
                      <strong>{meta.valDist.type}</strong>
                      {meta.valDist.params && (
                        <span className="ml-2 text-xs text-gray-500">
                          {Object.entries(meta.valDist.params)
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
                  {meta.costDist?.type ? (
                    <>
                      <strong>{meta.costDist.type}</strong>
                      {meta.costDist.params && (
                        <span className="ml-2 text-xs text-gray-500">
                          {Object.entries(meta.costDist.params)
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
                <div className="mt-1 text-sm">{meta.matching}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <KpiCard title="Trade volume" value={metrics.tradeVolume} />
            <KpiCard
              title="Avg price"
              value={
                metrics.averagePrice ? metrics.averagePrice.toFixed(2) : "—"
              }
            />
            <KpiCard
              title="Total surplus"
              value={
                metrics.totalSurplus ? metrics.totalSurplus.toFixed(2) : "—"
              }
            />
            <KpiCard
              title="Deadlock %"
              value={
                metrics.deadlockRate
                  ? (metrics.deadlockRate * 100).toFixed(1) + "%"
                  : "—"
              }
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PriceLineChart data={lineData} />
        <DealsBarChart data={barData} />
        <SurplusPie
          consumer={metrics.consumerSurplus}
          producer={metrics.producerSurplus}
        />
        <Histogram values={allPrices} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <BuyersTable buyers={buyers} />
        <SellersTable sellers={sellers} />
        <RoundSummary rounds={rounds} />
      </div>

      <div className="flex space-x-2">
        <button
          onClick={() =>
            downloadJSON(
              { metrics, rounds, buyers, sellers, allPrices },
              `run-${runId}.json`
            )
          }
          className="px-3 py-2 bg-indigo-600 text-white rounded"
        >
          Export JSON
        </button>
        <button
          onClick={() => downloadCSV(rounds, `rounds-${runId}.csv`)}
          className="px-3 py-2 border rounded"
        >
          Export CSV (rounds)
        </button>
      </div>
    </div>
  );
}
