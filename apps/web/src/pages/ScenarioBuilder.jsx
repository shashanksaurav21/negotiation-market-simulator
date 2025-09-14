import React, { useState } from "react";
import api from "../api/client";
import { useNavigate } from "react-router-dom";
import TooltipIcon from "../components/TooltipIcon";
import DistributionInputs from "../components/DistributionInputs";
import validateForm from "../utils/validations";

const defaultScenario = {
  name: "Scenario " + Date.now(),
  numBuyers: 50,
  numSellers: 50,
  rounds: 20,
  valuationDistribution: { type: "normal", params: { mu: 100, sigma: 15 } },
  costDistribution: { type: "normal", params: { mu: 60, sigma: 10 } },
  matchingPolicy: "best-fit",
  negotiationStrategyBuyer: "fair",
  negotiationStrategySeller: "fair",
  seed: Math.floor(Math.random() * 100000),
};

export default function ScenarioBuilder() {
  const [form, setForm] = useState(defaultScenario);
  const [loading, setLoading] = useState(false);
  const [warning, setWarning] = useState(null);
  const nav = useNavigate();

  // function validateForm(f) {
  //   if (f.numBuyers < 1 || f.numSellers < 1)
  //     return "Buyers and sellers must be >=1";
  //   if (f.valuationDistribution.type === "uniform") {
  //     const p = f.valuationDistribution.params || {};
  //     if (p.min === undefined || p.max === undefined)
  //       return "Uniform valuation requires min and max";
  //     if (p.min >= p.max) return "valuation min must be < max";
  //   }
  //   if (f.costDistribution.type === "uniform") {
  //     const p = f.costDistribution.params || {};
  //     if (p.min === undefined || p.max === undefined)
  //       return "Uniform cost requires min and max";
  //   }
  //   // crude warning
  //   const v = f.valuationDistribution,
  //     c = f.costDistribution;
  //   const valMean =
  //     v.type === "uniform"
  //       ? (v.params.min + v.params.max) / 2
  //       : v.params.mu || 0;
  //   const costMean =
  //     c.type === "uniform"
  //       ? (c.params.min + c.params.max) / 2
  //       : c.params.mu || 0;
  //   if (costMean > valMean + 20)
  //     setWarning(
  //       "Warning: seller costs on average much higher than buyer valuations — many deadlocks likely."
  //     );
  //   else setWarning(null);
  //   return null;
  // }

  async function handleRun(e) {
    e.preventDefault();
    const err = validateForm(form, setWarning);
    if (err) return alert(err);
    setLoading(true);
    try {
      const res = await api.post("/simulations/run", form);
      const { runId, result } = res.data;
      nav(`/results/${runId}`, { state: { result } });
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleRun} className="bg-white p-6 rounded shadow">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Scenario name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Seed</label>
            <input
              type="number"
              value={form.seed}
              onChange={(e) =>
                setForm({ ...form, seed: Number(e.target.value) })
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Buyers</label>
            <input
              type="number"
              value={form.numBuyers}
              min="1"
              max="200"
              onChange={(e) =>
                setForm({ ...form, numBuyers: Number(e.target.value) })
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Sellers</label>
            <input
              type="number"
              value={form.numSellers}
              min="1"
              max="200"
              onChange={(e) =>
                setForm({ ...form, numSellers: Number(e.target.value) })
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Rounds</label>
            <input
              type="number"
              value={form.rounds}
              min="1"
              max="200"
              onChange={(e) =>
                setForm({ ...form, rounds: Number(e.target.value) })
              }
              className="mt-1 block w-full border rounded p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Matching policy <TooltipIcon title="random or best-fit" />
            </label>
            <select
              value={form.matchingPolicy}
              onChange={(e) =>
                setForm({ ...form, matchingPolicy: e.target.value })
              }
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="best-fit">best-fit</option>
              <option value="random">random</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Buyer strategy</label>
            <select
              value={form.negotiationStrategyBuyer}
              onChange={(e) =>
                setForm({ ...form, negotiationStrategyBuyer: e.target.value })
              }
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="fair">fair</option>
              <option value="aggressive">aggressive</option>
              <option value="opportunistic">opportunistic</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Seller strategy</label>
            <select
              value={form.negotiationStrategySeller}
              onChange={(e) =>
                setForm({ ...form, negotiationStrategySeller: e.target.value })
              }
              className="mt-1 block w-full border rounded p-2"
            >
              <option value="fair">fair</option>
              <option value="aggressive">aggressive</option>
              <option value="opportunistic">opportunistic</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div>
            <h4 className="font-medium mb-2">Valuation distribution</h4>
            <DistributionInputs
              value={form.valuationDistribution}
              onChange={(v) => setForm({ ...form, valuationDistribution: v })}
              label="Buyer valuation"
            />
          </div>
          <div>
            <h4 className="font-medium mb-2">Cost distribution</h4>
            <DistributionInputs
              value={form.costDistribution}
              onChange={(v) => setForm({ ...form, costDistribution: v })}
              label="Seller cost"
            />
          </div>
        </div>

        {warning && <div className="mt-4 text-yellow-700">{warning}</div>}

        <div className="mt-6 flex items-center space-x-3">
          <button
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            {loading ? "Running..." : "Run Simulation"}
          </button>
        </div>
      </form>
    </div>
  );
}
