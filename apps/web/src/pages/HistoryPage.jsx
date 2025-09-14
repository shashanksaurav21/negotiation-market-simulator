import React, { useEffect, useState } from "react";
import api from "../api/client";
import { useNavigate } from "react-router-dom";

/**
 * HistoryPage
 * - Filters: separate buyer & seller strategy, from date, to date
 * - Displays run metadata including:
 *    - scenario name
 *    - strategy labels (buyer/seller)
 *    - matching policy
 *    - valuation distribution (type + params)
 *    - cost distribution (type + params)
 *    - seed, deals (tradeVolume)
 * - Allows selecting two runs to compare (fetches full runs then navigates to /results/compare)
 */
export default function HistoryPage() {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  // NEW: separate buyer & seller strategy filters
  const [buyerStrategyFilter, setBuyerStrategyFilter] = useState("");
  const [sellerStrategyFilter, setSellerStrategyFilter] = useState("");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [total, setTotal] = useState(0);

  const nav = useNavigate();

  function buildQuery() {
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    if (buyerStrategyFilter)
      params.set("buyerStrategy", buyerStrategyFilter.toLowerCase());
    if (sellerStrategyFilter)
      params.set("sellerStrategy", sellerStrategyFilter.toLowerCase());
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    return params.toString();
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = buildQuery();
        const res = await api.get("/simulations?" + q);
        // backend returns { page, pageSize, items, total }
        setItems(res.data.items || []);
        setTotal(res.data.total ?? 0);
      } catch (err) {
        console.error(err);
        alert("Failed to fetch history");
      } finally {
        setLoading(false);
      }
    })();
  }, [page, buyerStrategyFilter, sellerStrategyFilter, fromDate, toDate]);

  function toggle(id) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-2)
    );
  }

  async function compareSelected() {
    if (selected.length !== 2) {
      alert("Select two runs");
      return;
    }
    try {
      const [aRes, bRes] = await Promise.all(
        selected.map((id) => api.get(`/simulations/${id}`))
      );
      nav("/results/compare", { state: { a: aRes.data, b: bRes.data } });
    } catch (err) {
      console.error("Compare fetch error:", err);
      alert("Failed to fetch runs for comparison");
    }
  }

  // helper to render distribution params nicely
  function distSummary(dist) {
    if (!dist) return "—";
    const t = dist.type;
    const p = dist.params || {};
    if (t === "uniform") {
      return `uniform (min: ${p.min ?? "—"}, max: ${p.max ?? "—"})`;
    }
    if (t === "normal") {
      return `normal (μ: ${p.mu ?? "—"}, σ: ${p.sigma ?? "—"})`;
    }
    if (t === "lognormal") {
      return `lognormal (μ: ${p.mu ?? "—"}, σ: ${p.sigma ?? "—"})`;
    }
    return `${t}`;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium">History</h2>

      {/* Filters */}
      <div className="bg-white p-4 rounded shadow grid grid-cols-6 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium">Buyer strategy</label>
          <select
            value={buyerStrategyFilter}
            onChange={(e) => {
              setBuyerStrategyFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="">All</option>
            <option value="fair">Fair</option>
            <option value="aggressive">Aggressive</option>
            <option value="opportunistic">Opportunistic</option>
          </select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium">Seller strategy</label>
          <select
            value={sellerStrategyFilter}
            onChange={(e) => {
              setSellerStrategyFilter(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="">All</option>
            <option value="fair">Fair</option>
            <option value="aggressive">Aggressive</option>
            <option value="opportunistic">Opportunistic</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>

        <div className="col-span-6 flex items-end space-x-2">
          <button
            onClick={() => {
              setBuyerStrategyFilter("");
              setSellerStrategyFilter("");
              setFromDate("");
              setToDate("");
              setPage(1);
            }}
            className="px-3 py-2 border rounded"
          >
            Clear
          </button>
          <button
            onClick={() => setPage(1)}
            className="px-3 py-2 bg-indigo-600 text-white rounded"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Summary row */}
      <div className="text-sm text-gray-600">
        Showing {items.length} results (page {page}){" "}
        {total ? ` — ${total} total` : ""}
      </div>

      {/* List / Table of runs */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const sc = item.scenario || {};
            const params = sc.params || {};
            const valDist = params.valuationDistribution || {};
            const costDist = params.costDistribution || {};
            const buyerStr =
              sc.negotiationStrategyBuyer ||
              params.negotiationStrategyBuyer ||
              "—";
            const sellerStr =
              sc.negotiationStrategySeller ||
              params.negotiationStrategySeller ||
              "—";
            const matching =
              params.matchingPolicy || sc.params?.matchingPolicy || "—";

            return (
              <div
                key={item.runId}
                className="bg-white p-3 rounded flex flex-col md:flex-row md:items-center md:justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        Run #{item.runId} — {sc.name || ""}
                      </div>
                      <div className="text-xs text-gray-400">
                        created: {new Date(item.runCreatedAt).toLocaleString()}
                      </div>
                    </div>

                    <div className="hidden md:flex md:space-x-4 text-sm">
                      <div className="px-2 py-1 bg-gray-100 rounded text-gray-700">
                        Seed: {item.seed}
                      </div>
                      <div className="px-2 py-1 bg-green-50 rounded text-green-800">
                        Deals: {item.metrics?.tradeVolume ?? "—"}
                      </div>
                      <div className="px-2 py-1 bg-yellow-50 rounded text-yellow-800">
                        Deadlock %:{" "}
                        {item.metrics?.deadlockRate
                          ? (item.metrics.deadlockRate * 100).toFixed(1) + "%"
                          : "—"}
                      </div>
                    </div>
                  </div>

                  {/* small grid of properties */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs text-gray-500">Strategies</div>
                      <div className="mt-1">
                        <span className="inline-block mr-2 px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs">
                          Buyer: {buyerStr}
                        </span>
                        <span className="inline-block px-2 py-1 bg-pink-50 text-pink-700 rounded text-xs">
                          Seller: {sellerStr}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">Matching</div>
                      <div className="mt-1">
                        <span className="inline-block px-2 py-1 bg-gray-50 rounded text-xs">
                          {matching}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Buyer valuation distribution
                      </div>
                      <div className="mt-1 text-sm">{distSummary(valDist)}</div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500">
                        Seller cost distribution
                      </div>
                      <div className="mt-1 text-sm">
                        {distSummary(costDist)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 md:mt-0 md:ml-4 flex items-center space-x-2">
                  <button
                    onClick={() => nav(`/results/${item.runId}`)}
                    className="px-2 py-1 border rounded"
                  >
                    View
                  </button>

                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selected.includes(item.runId)}
                      onChange={() => toggle(item.runId)}
                    />
                    <span className="text-sm">Compare</span>
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination & actions */}
      <div className="mt-4 flex items-center space-x-2">
        <button
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-2 py-1 border rounded"
        >
          Prev
        </button>
        <div>Page {page}</div>
        <button
          onClick={() => setPage((p) => p + 1)}
          className="px-2 py-1 border rounded"
        >
          Next
        </button>

        <div className="ml-4">
          <button
            onClick={compareSelected}
            className="px-3 py-1 bg-indigo-600 text-white rounded"
          >
            Compare Selected
          </button>
        </div>
      </div>
    </div>
  );
}
