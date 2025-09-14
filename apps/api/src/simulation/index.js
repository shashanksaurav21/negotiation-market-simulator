"use strict";

const seedrandom = require("seedrandom");
const { gini } = require("./gini"); // adjust path if you placed gini elsewhere

// ---------- pasted helpers (from your snippet) ----------
function makeRng(seed) {
  return seedrandom(String(seed));
}

// Box–Muller normal generator
function normal(rng, mu = 0, sigma = 1) {
  let u = 0,
    v = 0;
  while (u === 0) u = rng();
  while (v === 0) v = rng();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * sigma + mu;
}

function sample(dist, rng) {
  const type = dist.type;
  const p = dist.params || {};
  if (type === "uniform") {
    const min = p.min ?? 0;
    const max = p.max ?? 1;
    return min + rng() * (max - min);
  } else if (type === "normal") {
    const mu = p.mu ?? 0;
    const sigma = p.sigma ?? 1;
    return normal(rng, mu, sigma);
  } else if (type === "lognormal") {
    const mu = p.mu ?? 0;
    const sigma = p.sigma ?? 1;
    return Math.exp(normal(rng, mu, sigma));
  }
  throw new Error("unknown dist type " + type);
}

// seeded Fisher-Yates shuffle
function shuffle(array, rng) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function concessionFractionForStrategy(strategy) {
  if (strategy === "aggressive") return 0.1; // small concessions
  if (strategy === "fair") return 0.5; // moderate
  if (strategy === "opportunistic") return 0.3; // adaptive baseline
  return 0.3;
}

function initialOfferByBuyer(strategy, buyerVal, sellerCost) {
  const gap = buyerVal - sellerCost;
  if (strategy === "aggressive") return sellerCost + gap * 0.2;
  if (strategy === "fair") return sellerCost + gap * 0.5;
  if (strategy === "opportunistic") return sellerCost + gap * 0.35;
  return sellerCost + gap * 0.5;
}

function initialOfferBySeller(strategy, buyerVal, sellerCost) {
  const gap = buyerVal - sellerCost;
  if (strategy === "aggressive") return buyerVal - gap * 0.2;
  if (strategy === "fair") return sellerCost + gap * 0.5;
  if (strategy === "opportunistic") return sellerCost + gap * 0.65;
  return sellerCost + gap * 0.5;
}

// Concession: move `fraction` toward target value
function moveToward(current, target, fraction) {
  return current + (target - current) * fraction;
}

function negotiatePair({
  buyerVal,
  sellerCost,
  buyerStrategy,
  sellerStrategy,
  rng,
  maxOffers = 5,
}) {
  const history = [];
  let buyerOffer = initialOfferByBuyer(buyerStrategy, buyerVal, sellerCost);
  let sellerOffer = initialOfferBySeller(sellerStrategy, buyerVal, sellerCost);
  let buyerConcessionBase = concessionFractionForStrategy(buyerStrategy);
  let sellerConcessionBase = concessionFractionForStrategy(sellerStrategy);

  // make sure offers are numeric bounds
  buyerOffer = Math.max(buyerOffer, sellerCost);
  sellerOffer = Math.max(sellerOffer, sellerCost);

  let lastBuyerOffer = null;
  let lastSellerOffer = null;

  for (let turn = 0; turn < maxOffers; turn++) {
    const isBuyerTurn = turn % 2 === 0;
    if (isBuyerTurn) {
      // buyer offers
      const price = Math.min(buyerOffer, buyerVal); // buyer shouldn't offer > buyerVal
      history.push({ actor: "buyer", price });
      if (price >= sellerCost && price <= buyerVal) {
        return { price, history, offers: turn + 1 };
      }
      // seller counters
      const recentBuyerConcession =
        lastBuyerOffer !== null ? Math.abs(buyerOffer - lastBuyerOffer) : 0;
      let sellerConcession = sellerConcessionBase;
      if (sellerStrategy === "opportunistic" && recentBuyerConcession > 0) {
        sellerConcession = Math.min(
          0.8,
          sellerConcession + recentBuyerConcession * 2
        );
      }
      lastSellerOffer = sellerOffer;
      sellerOffer = moveToward(sellerOffer, buyerOffer, sellerConcession);
      sellerOffer = Math.max(sellerOffer, sellerCost); // do not go below cost
    } else {
      // seller offers
      const price = Math.max(sellerOffer, sellerCost);
      history.push({ actor: "seller", price });
      if (price >= sellerCost && price <= buyerVal) {
        return { price, history, offers: turn + 1 };
      }
      // buyer counters
      const recentSellerConcession =
        lastSellerOffer !== null ? Math.abs(sellerOffer - lastSellerOffer) : 0;
      let buyerConcession = buyerConcessionBase;
      if (buyerStrategy === "opportunistic" && recentSellerConcession > 0) {
        buyerConcession = Math.min(
          0.8,
          buyerConcession + recentSellerConcession * 2
        );
      }
      lastBuyerOffer = buyerOffer;
      buyerOffer = moveToward(buyerOffer, sellerOffer, buyerConcession);
      buyerOffer = Math.min(buyerOffer, buyerVal);
    }
  }

  // deadlock
  return { price: null, history, offers: maxOffers };
}
// ---------- end pasted helpers ----------

// ---------- runSimulation implementation ----------
/**
 * params must contain:
 *  - numBuyers, numSellers, rounds,
 *  - valuationDistribution: { type, params }
 *  - costDistribution: { type, params }
 *  - matchingPolicy: 'random' | 'best-fit'
 *  - negotiationStrategyBuyer, negotiationStrategySeller
 *  - seed
 */
function runSimulation(params) {
  const rng = makeRng(params.seed ?? 0);

  const numBuyers = Math.max(1, Math.floor(params.numBuyers || 1));
  const numSellers = Math.max(1, Math.floor(params.numSellers || 1));
  const roundsCount = Math.max(1, Math.floor(params.rounds || 1));
  const pairsPerRound = Math.min(numBuyers, numSellers);

  // Draw buyer valuations and seller costs (once per run)
  const buyers = [];
  for (let i = 0; i < numBuyers; i++) {
    // clamp to >=0
    const val = Math.max(0, sample(params.valuationDistribution, rng));
    buyers.push({ id: `B${i + 1}`, valuation: val, realizedSurplus: 0 });
  }

  const sellers = [];
  for (let i = 0; i < numSellers; i++) {
    const cost = Math.max(0, sample(params.costDistribution, rng));
    sellers.push({ id: `S${i + 1}`, cost: cost, realizedSurplus: 0 });
  }

  // Accumulators
  const rounds = [];
  const allDealPrices = [];
  let totalConsumerSurplus = 0;
  let totalProducerSurplus = 0;
  let totalOffersForDeals = 0;
  let totalDeadlocks = 0;

  // Per-round simulation
  for (let roundNum = 1; roundNum <= roundsCount; roundNum++) {
    // Build pairs according to matchingPolicy
    let buyersRoundOrder;
    let sellersRoundOrder;

    if (params.matchingPolicy === "random") {
      buyersRoundOrder = shuffle(buyers, rng);
      sellersRoundOrder = shuffle(sellers, rng);
    } else {
      // best-fit: buyers descending valuation, sellers ascending cost
      buyersRoundOrder = buyers
        .slice()
        .sort((a, b) => b.valuation - a.valuation);
      sellersRoundOrder = sellers.slice().sort((a, b) => a.cost - b.cost);
    }

    const pricesThisRound = [];
    let deals = 0;
    let deadlocks = 0;
    let offersThisRound = 0;

    for (let i = 0; i < pairsPerRound; i++) {
      const buyer = buyersRoundOrder[i];
      const seller = sellersRoundOrder[i];

      // Run negotiation between this buyer & seller
      const { price, history, offers } = negotiatePair({
        buyerVal: buyer.valuation,
        sellerCost: seller.cost,
        buyerStrategy: params.negotiationStrategyBuyer,
        sellerStrategy: params.negotiationStrategySeller,
        rng: rng,
        maxOffers: 5,
      });

      if (price !== null && Number.isFinite(price)) {
        // deal
        deals++;
        pricesThisRound.push(price);
        allDealPrices.push(price);
        offersThisRound += offers;
        totalOffersForDeals += offers;

        // surplus
        const buyerSurplus = buyer.valuation - price;
        const sellerSurplus = price - seller.cost;

        // accumulate per-agent realized surplus
        buyer.realizedSurplus =
          (buyer.realizedSurplus || 0) + Math.max(0, buyerSurplus);
        seller.realizedSurplus =
          (seller.realizedSurplus || 0) + Math.max(0, sellerSurplus);

        totalConsumerSurplus += Math.max(0, buyerSurplus);
        totalProducerSurplus += Math.max(0, sellerSurplus);
      } else {
        // deadlock
        deadlocks++;
        totalDeadlocks++;
      }
    } // end pairs loop

    const avgPriceThisRound =
      pricesThisRound.length > 0
        ? pricesThisRound.reduce((s, p) => s + p, 0) / pricesThisRound.length
        : null;

    rounds.push({
      roundNum,
      deals,
      deadlocks,
      avgPrice: avgPriceThisRound,
      prices: pricesThisRound,
      avgOffers: deals > 0 ? offersThisRound / deals : 0,
    });
  } // end rounds loop

  const tradeVolume = allDealPrices.length;
  const averagePrice =
    tradeVolume > 0
      ? allDealPrices.reduce((s, p) => s + p, 0) / tradeVolume
      : null;
  const totalSurplus = totalConsumerSurplus + totalProducerSurplus;
  const totalPairs = roundsCount * pairsPerRound;
  const deadlockRate = totalPairs > 0 ? totalDeadlocks / totalPairs : 0;
  const avgOffersToDeal =
    tradeVolume > 0 ? totalOffersForDeals / tradeVolume : 0;

  // Build array of per-agent surplus for Gini (buyers + sellers)
  const buyerSurplusArr = buyers.map((b) => b.realizedSurplus || 0);
  const sellerSurplusArr = sellers.map((s) => s.realizedSurplus || 0);
  const allSurpluses = buyerSurplusArr.concat(sellerSurplusArr);
  const giniSurplus = typeof gini === "function" ? gini(allSurpluses) : 0;

  const metrics = {
    tradeVolume,
    averagePrice,
    consumerSurplus: totalConsumerSurplus,
    producerSurplus: totalProducerSurplus,
    totalSurplus,
    deadlockRate,
    giniSurplus,
    avgOffersToDeal,
  };

  // return a complete result object
  return {
    params: {
      numBuyers,
      numSellers,
      rounds: roundsCount,
      matchingPolicy: params.matchingPolicy,
      buyerStrategy: params.negotiationStrategyBuyer,
      sellerStrategy: params.negotiationStrategySeller,
      seed: params.seed,
    },
    metrics,
    rounds,
    allDealPrices,
    buyers: buyers.map((b) => ({
      id: b.id,
      valuation: b.valuation,
      realizedSurplus: b.realizedSurplus || 0,
    })),
    sellers: sellers.map((s) => ({
      id: s.id,
      cost: s.cost,
      realizedSurplus: s.realizedSurplus || 0,
    })),
  };
}
// ---------- end runSimulation ----------

module.exports = {
  runSimulation,
  negotiatePair,
  sample,
  shuffle,
};
