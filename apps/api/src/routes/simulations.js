// apps/api/src/routes/simulations.js
"use strict";

const express = require("express");
const router = express.Router();
const prisma = require("../db/prismaClient");
const { scenarioSchema } = require("../validators/scenarioSchema");
const { runSimulation } = require("../simulation"); // ensure this exports runSimulation
const { z } = require("zod");

/** Simple body validator middleware using Zod */
const validateBody = (schema) => (req, res, next) => {
  try {
    req.validatedBody = schema.parse(req.body);
    next();
  } catch (err) {
    return res.status(400).json({ error: err.errors ?? err });
  }
};

/**
 * POST /api/simulations/run
 * - Runs the simulation immediately, persists Scenario + Run + RunRounds (detailed),
 *   and returns full simulation result (metrics + per-round snapshots).
 */
router.post("/run", validateBody(scenarioSchema), async (req, res) => {
  const params = req.validatedBody;

  // 1) Run simulation (synchronous or async depending on your implementation)
  let result;
  try {
    result = runSimulation(params);
    // if runSimulation is async: result = await runSimulation(params);
  } catch (err) {
    console.error("Simulation error:", err);
    return res.status(500).json({ error: "Simulation failed" });
  }

  // 2) Persist scenario + run + runRounds (stringify JSON-like fields)
  try {
    const paramsJson = JSON.stringify(params);
    const metricsJson = JSON.stringify(result.metrics);
    const buyersJson = JSON.stringify(result.buyers || []);
    const sellersJson = JSON.stringify(result.sellers || []);

    const created = await prisma.$transaction(async (tx) => {
      // const scenario = await tx.scenario.create({
      //   data: { name: params.name ?? null, params: paramsJson },
      // });
      const scenario = await tx.scenario.create({
        data: {
          name: params.name ?? null,
          params: paramsJson,
          negotiationStrategyBuyer:
            (params.negotiationStrategyBuyer || "").toLowerCase() || null,
          negotiationStrategySeller:
            (params.negotiationStrategySeller || "").toLowerCase() || null,
        },
      });

      const run = await tx.run.create({
        data: {
          scenarioId: scenario.id,
          seed: params.seed ?? null,
          metrics: metricsJson,
          buyers: buyersJson,
          sellers: sellersJson,
        },
      });

      // persist detailed run rounds
      const roundCreates = result.rounds.map((r) =>
        tx.runRound.create({
          data: {
            runId: run.id,
            roundNum: r.roundNum,
            deals: r.deals,
            deadlocks: r.deadlocks,
            avgPrice: r.avgPrice ?? null,
            priceDistribution: JSON.stringify(r.prices || []),
          },
        })
      );

      await Promise.all(roundCreates);

      return { scenario, run };
    });

    return res.status(200).json({
      scenarioId: created.scenario.id,
      runId: created.run.id,
      result, // full JS object (metrics, rounds, buyers/sellers etc.)
    });
  } catch (err) {
    console.error("DB save error (run):", err);
    return res.status(500).json({ error: "Failed to save run" });
  }
});

/**
 * POST /api/simulations
 * - Create a scenario and compute & store a summary (metrics) by running the simulation.
 * - Persist scenario + run (metrics only). Do NOT persist detailed RunRound entries here.
 * - Return scenario record and computed summary (metrics).
 *
 * This route satisfies "create scenario (store inputs + computed summary after run)".
 */
router.post("/", validateBody(scenarioSchema), async (req, res) => {
  const params = req.validatedBody;

  // Run simulation to compute summary (but we'll only persist metrics here)
  let result;
  try {
    result = runSimulation(params);
  } catch (err) {
    console.error("Simulation error (create scenario):", err);
    return res.status(500).json({ error: "Simulation failed" });
  }

  try {
    const paramsJson = JSON.stringify(params);
    const metricsJson = JSON.stringify(result.metrics);

    const created = await prisma.$transaction(async (tx) => {
      // const scenario = await tx.scenario.create({
      //   data: { name: params.name ?? null, params: paramsJson },
      // });

      const scenario = await tx.scenario.create({
        data: {
          name: params.name ?? null,
          params: paramsJson,
          negotiationStrategyBuyer: params.negotiationStrategyBuyer ?? null,
          negotiationStrategySeller: params.negotiationStrategySeller ?? null,
        },
      });

      const run = await tx.run.create({
        data: {
          scenarioId: scenario.id,
          seed: params.seed ?? null,
          metrics: metricsJson,
        },
      });

      return { scenario, run };
    });

    // Return scenario and computed summary (metrics) — no detailed rounds persisted
    return res.status(201).json({
      scenarioId: created.scenario.id,
      runId: created.run.id,
      metrics: result.metrics,
    });
  } catch (err) {
    console.error("DB save error (create scenario):", err);
    return res
      .status(500)
      .json({ error: "Failed to save scenario and summary" });
  }
});

/**
 * GET /api/simulations
 * - List scenarios / runs (paginated)
 * - Query params:
 *    - page, pageSize
 *    - strategy (filter by negotiationStrategyBuyer or negotiationStrategySeller)
 *    - from, to (ISO dates) to filter by scenario.createdAt or run.createdAt
 */
// router.get("/", async (req, res) => {
//   try {
//     // pagination & filters
//     const page = Math.max(1, parseInt(req.query.page || "1", 10));
//     const pageSize = Math.min(
//       100,
//       Math.max(1, parseInt(req.query.pageSize || "10", 10))
//     );
//     const skip = (page - 1) * pageSize;

//     const { strategy, from, to } = req.query;

//     // Build basic where clause for runs join scenario if needed
//     // For simplicity: we fetch runs with included scenario and allow filtering server-side
//     const runs = await prisma.run.findMany({
//       include: { scenario: true },
//       orderBy: { createdAt: "desc" },
//       skip,
//       take: pageSize,
//     });

//     // Post-process results: parse metrics and scenario.params, apply optional filters
//     const processed = runs
//       .map((r) => {
//         let metrics = null;
//         try {
//           metrics = r.metrics ? JSON.parse(r.metrics) : null;
//         } catch (e) {
//           metrics = r.metrics;
//         }
//         let scenarioParams = null;
//         try {
//           scenarioParams =
//             r.scenario && r.scenario.params
//               ? JSON.parse(r.scenario.params)
//               : null;
//         } catch (e) {
//           scenarioParams = r.scenario.params;
//         }
//         return {
//           runId: r.id,
//           runCreatedAt: r.createdAt,
//           seed: r.seed,
//           metrics,
//           scenario: {
//             id: r.scenario.id,
//             name: r.scenario.name,
//             params: scenarioParams,
//             createdAt: r.scenario.createdAt,
//           },
//         };
//       })
//       .filter((item) => {
//         if (strategy) {
//           // filter by strategy if provided (matches either buyer or seller strategy)
//           const buyer = item.scenario.params?.negotiationStrategyBuyer;
//           const seller = item.scenario.params?.negotiationStrategySeller;
//           if (buyer !== strategy && seller !== strategy) return false;
//         }
//         if (from || to) {
//           const runDate = new Date(item.runCreatedAt);
//           if (from && runDate < new Date(from)) return false;
//           if (to && runDate > new Date(to)) return false;
//         }
//         return true;
//       });

//     return res.json({ page, pageSize, items: processed });
//   } catch (err) {
//     console.error("List runs error:", err);
//     return res.status(500).json({ error: "Failed to list simulations" });
//   }
// });

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const pageSize = Math.min(
      200,
      Math.max(1, parseInt(req.query.pageSize || "10", 10))
    );
    const skip = (page - 1) * pageSize;

    // New: parse separate buyer/seller strategy filters
    const buyerStrategy = req.query.buyerStrategy
      ? String(req.query.buyerStrategy).toLowerCase()
      : null;
    const sellerStrategy = req.query.sellerStrategy
      ? String(req.query.sellerStrategy).toLowerCase()
      : null;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    // Build Prisma where clause
    const where = {};

    // Date filter on run.createdAt
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = from;
      if (to) where.createdAt.lte = to;
    }

    // Scenario-level where: include buyer/seller strategy filters
    // We'll attach scenario: { ... } to the run where clause.
    const scenarioWhere = {};
    // Note: we assume strategies are stored normalized (lowercase) on create.
    if (buyerStrategy) scenarioWhere.negotiationStrategyBuyer = buyerStrategy;
    if (sellerStrategy)
      scenarioWhere.negotiationStrategySeller = sellerStrategy;

    // Build the final prisma where object. If no scenarioWhere conditions, don't include scenario filter.
    const prismaWhere = {
      AND: [
        where,
        Object.keys(scenarioWhere).length ? { scenario: scenarioWhere } : {},
      ].filter(Boolean),
    };

    // Query runs with join to scenario and apply where
    const runs = await prisma.run.findMany({
      where: prismaWhere,
      include: { scenario: true },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    });

    // Count total matching entries (useful for pagination)
    const total = await prisma.run.count({
      where: prismaWhere,
    });

    // Build response items (parse metrics and scenario.params)
    const items = runs.map((r) => {
      let metrics = null;
      try {
        metrics = r.metrics ? JSON.parse(r.metrics) : null;
      } catch (e) {
        metrics = r.metrics;
      }

      let scenarioParams = null;
      try {
        scenarioParams =
          r.scenario && r.scenario.params
            ? JSON.parse(r.scenario.params)
            : null;
      } catch (e) {
        scenarioParams = r.scenario.params;
      }

      return {
        runId: r.id,
        runCreatedAt: r.createdAt,
        seed: r.seed,
        metrics,
        scenario: {
          id: r.scenario.id,
          name: r.scenario.name,
          params: scenarioParams,
          negotiationStrategyBuyer: r.scenario.negotiationStrategyBuyer,
          negotiationStrategySeller: r.scenario.negotiationStrategySeller,
          createdAt: r.scenario.createdAt,
        },
      };
    });

    return res.json({ page, pageSize, items, total });
  } catch (err) {
    console.error("List runs error:", err);
    return res.status(500).json({ error: "Failed to list simulations" });
  }
});

/**
 * GET /api/simulations/:id
 * - Fetch a saved run by run id. Return run + parsed scenario + parsed metrics + parsed rounds.
 */
// router.get("/:id", async (req, res) => {
//   const id = parseInt(req.params.id, 10);
//   if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

//   try {
//     const run = await prisma.run.findUnique({
//       where: { id },
//       include: { scenario: true, rounds: true },
//     });

//     if (!run) return res.status(404).json({ error: "Run not found" });
//     // console.log(run, "runnn");

//     // parse scenario.params (String -> object)
//     let scenarioParams = null;
//     try {
//       scenarioParams =
//         run.scenario && run.scenario.params
//           ? JSON.parse(run.scenario.params)
//           : null;
//     } catch (e) {
//       console.warn("Failed to parse scenario.params JSON:", e);
//       scenarioParams = run.scenario.params;
//     }

//     // parse metrics
//     let metrics = null;
//     try {
//       metrics = run.metrics ? JSON.parse(run.metrics) : null;
//     } catch (e) {
//       console.warn("Failed to parse run.metrics JSON:", e);
//       metrics = run.metrics;
//     }

//     // parse each round.priceDistribution
//     const rounds = (run.rounds || []).map((r) => {
//       let prices = [];
//       try {
//         prices = r.priceDistribution ? JSON.parse(r.priceDistribution) : [];
//       } catch (e) {
//         console.warn("Failed to parse runRound.priceDistribution:", e);
//         prices = r.priceDistribution;
//       }
//       return {
//         id: r.id,
//         roundNum: r.roundNum,
//         deals: r.deals,
//         deadlocks: r.deadlocks,
//         avgPrice: r.avgPrice,
//         prices,
//         createdAt: r.createdAt,
//       };
//     });

//     // Build response object
//     const response = {
//       id: run.id,
//       seed: run.seed,
//       createdAt: run.createdAt,
//       scenario: {
//         id: run.scenario.id,
//         name: run.scenario.name,
//         params: scenarioParams,
//         createdAt: run.scenario.createdAt,
//       },
//       metrics,
//       rounds,
//     };

//     return res.json(response);
//   } catch (err) {
//     console.error("DB read error:", err);
//     return res.status(500).json({ error: "Failed to fetch run" });
//   }
// });

router.get("/:id", async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  try {
    const run = await prisma.run.findUnique({
      where: { id },
      include: { scenario: true, rounds: true },
    });

    if (!run) return res.status(404).json({ error: "Run not found" });

    // parse scenario.params (String -> object)
    let scenarioParams = null;
    try {
      scenarioParams =
        run.scenario && run.scenario.params
          ? JSON.parse(run.scenario.params)
          : null;
    } catch (e) {
      console.warn("Failed to parse scenario.params JSON:", e);
      scenarioParams = run.scenario.params;
    }

    // parse metrics
    let metrics = null;
    try {
      metrics = run.metrics ? JSON.parse(run.metrics) : null;
    } catch (e) {
      console.warn("Failed to parse run.metrics JSON:", e);
      metrics = run.metrics;
    }

    // parse each round.priceDistribution
    const rounds = (run.rounds || []).map((r) => {
      let prices = [];
      try {
        prices = r.priceDistribution ? JSON.parse(r.priceDistribution) : [];
      } catch (e) {
        console.warn("Failed to parse runRound.priceDistribution:", e);
        prices = r.priceDistribution;
      }
      return {
        id: r.id,
        roundNum: r.roundNum,
        deals: r.deals,
        deadlocks: r.deadlocks,
        avgPrice: r.avgPrice,
        prices,
        createdAt: r.createdAt,
      };
    });

    // parse buyers & sellers from run.buyers / run.sellers (if present)
    let buyers = [];
    let sellers = [];
    try {
      if (run.buyers) {
        buyers = Array.isArray(run.buyers)
          ? run.buyers
          : JSON.parse(run.buyers);
      }
    } catch (e) {
      console.warn("Failed to parse run.buyers JSON:", e);
      buyers = [];
    }

    try {
      if (run.sellers) {
        sellers = Array.isArray(run.sellers)
          ? run.sellers
          : JSON.parse(run.sellers);
      }
    } catch (e) {
      console.warn("Failed to parse run.sellers JSON:", e);
      sellers = [];
    }

    // In case buyers/sellers weren't persisted, try to recover from scenario params or leave empty
    if (
      (!buyers || buyers.length === 0) &&
      scenarioParams &&
      scenarioParams._buyers
    ) {
      buyers = scenarioParams._buyers;
    }
    if (
      (!sellers || sellers.length === 0) &&
      scenarioParams &&
      scenarioParams._sellers
    ) {
      sellers = scenarioParams._sellers;
    }

    // compute top 10 by realizedSurplus (descending). If realizedSurplus missing, use 0.
    const topN = 10;
    const topBuyers = [...buyers]
      .map((b) => ({ ...b, realizedSurplus: Number(b.realizedSurplus || 0) }))
      .sort((a, b) => b.realizedSurplus - a.realizedSurplus)
      .slice(0, topN);

    const topSellers = [...sellers]
      .map((s) => ({ ...s, realizedSurplus: Number(s.realizedSurplus || 0) }))
      .sort((a, b) => b.realizedSurplus - a.realizedSurplus)
      .slice(0, topN);

    // Build response object (include full arrays + top lists)
    const response = {
      id: run.id,
      seed: run.seed,
      createdAt: run.createdAt,
      scenario: {
        id: run.scenario.id,
        name: run.scenario.name,
        params: scenarioParams,
        createdAt: run.scenario.createdAt,
      },
      metrics,
      rounds,
      buyers, // full buyers array (may be empty if not persisted)
      sellers, // full sellers array (may be empty if not persisted)
      topBuyers, // top 10 buyers by surplus
      topSellers, // top 10 sellers by surplus
    };

    return res.json(response);
  } catch (err) {
    console.error("DB read error:", err);
    return res.status(500).json({ error: "Failed to fetch run" });
  }
});

module.exports = router;
