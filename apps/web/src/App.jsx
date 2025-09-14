import React from "react";
import { Routes, Route, Link } from "react-router-dom";
import ScenarioBuilder from "./pages/ScenarioBuilder";
import ResultsPage from "./pages/ResultsPage";
import HistoryPage from "./pages/HistoryPage";
import CompareResults from "./pages/CompareResults";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">
            Negotiation Market Simulator
          </h1>
          <nav className="space-x-4">
            <Link className="text-indigo-600" to="/">
              Build
            </Link>
            <Link to="/history" className="text-gray-600">
              History
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <Routes>
          <Route path="/" element={<ScenarioBuilder />} />
          <Route path="/results/compare" element={<CompareResults />} />
          <Route path="/results/:runId" element={<ResultsPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Routes>
      </main>
    </div>
  );
}
