/**
 * Compute Gini coefficient for a non-negative numeric array.
 *
 * Returns value in [0, 1] (0 = perfect equality, 1 = maximal inequality).
 *
 * Implementation notes:
 *  - Uses the common formula:
 *      G = (2 * sum_{i=1..n} i * x_i) / (n * sum_x) - (n + 1) / n
 *    where x_i are sorted in non-decreasing order (i starting at 1).
 *  - Handles edge cases: empty array -> 0, total sum == 0 -> 0.
 *  - If values contain negatives (shouldn't for surplus), they are clamped to 0.
 *
 * Complexity: O(n log n) due to sorting.
 */
function gini(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;

  // Work on a copy, clamp negatives to 0 (surplus shouldn't be negative)
  const arr = values.map((v) => (typeof v === "number" && v > 0 ? v : 0));

  const n = arr.length;
  const sum = arr.reduce((s, v) => s + v, 0);

  if (sum === 0) return 0; // no dispersion if everyone has zero

  // Sort ascending
  arr.sort((a, b) => a - b);

  // Compute the weighted sum: sum_{i=1..n} i * x_i
  // Use numeric accumulation to avoid precision drift
  let weightedSum = 0;
  for (let i = 0; i < n; i++) {
    weightedSum += (i + 1) * arr[i];
  }

  const g = (2 * weightedSum) / (n * sum) - (n + 1) / n;
  // Gini should be between 0 and 1 — clamp to [0,1] for safety
  return Math.max(0, Math.min(1, g));
}

module.exports = { gini };
