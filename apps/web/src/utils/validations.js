function expectedMean(dist = {}) {
  const type = dist?.type;
  const p = dist?.params || {};
  if (type === "uniform") {
    const min = Number(p.min ?? 0);
    const max = Number(p.max ?? 0);
    return (min + max) / 2;
  }
  if (type === "normal") {
    return Number(p.mu ?? 0);
  }
  if (type === "lognormal") {
    const mu = Number(p.mu ?? 0);
    const sigma = Number(p.sigma ?? 0);
    return Math.exp(mu + 0.5 * sigma * sigma);
  }
  return null;
}

export default function validateForm(f, setWarning) {
  if (f.numBuyers < 1 || f.numSellers < 1)
    return "Buyers and sellers must be >=1";

  // uniform checks
  if (f.valuationDistribution.type === "uniform") {
    const p = f.valuationDistribution.params || {};
    if (p.min === undefined || p.max === undefined)
      return "Uniform valuation requires min and max";
    if (p.min >= p.max) return "valuation min must be < max";
  }
  if (f.costDistribution.type === "uniform") {
    const p = f.costDistribution.params || {};
    if (p.min === undefined || p.max === undefined)
      return "Uniform cost requires min and max";
    if (p.min >= p.max) return "cost min must be < max";
  }

  // compute expected means and warn/block accordingly
  const vMean = expectedMean(f.valuationDistribution);
  const cMean = expectedMean(f.costDistribution);

  if (vMean != null && cMean != null) {
    // extreme reject
    if (cMean > vMean * 5) {
      return "Seller costs are massively larger than buyer valuations — please adjust distributions.";
    }

    // non-blocking warning
    if (cMean > vMean * 1.5 || cMean > vMean + 20) {
      window.alert(
        `Warning: Seller expected costs (~${cMean.toFixed(
          2
        )}) exceed buyer valuations (~${vMean.toFixed(
          2
        )}). Expect many deadlocks.`
      );
    } else {
      setWarning(null);
    }
  } else {
    setWarning(null);
  }

  return null;
}
