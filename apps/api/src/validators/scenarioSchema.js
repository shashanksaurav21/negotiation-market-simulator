const { z } = require("zod");

// Distribution schema based on type
const distributionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("uniform"),
    params: z.object({
      min: z.number(),
      max: z.number(),
    }),
  }),
  z.object({
    type: z.literal("normal"),
    params: z.object({
      mu: z.number(),
      sigma: z.number().positive(),
    }),
  }),
  z.object({
    type: z.literal("lognormal"),
    params: z.object({
      mu: z.number(),
      sigma: z.number().positive(),
    }),
  }),
]);

// Full scenario schema
const scenarioSchema = z.object({
  name: z.string().optional(),
  numBuyers: z.number().int().min(1).max(200),
  numSellers: z.number().int().min(1).max(200),
  rounds: z.number().int().min(1).max(200),
  valuationDistribution: distributionSchema,
  costDistribution: distributionSchema,
  matchingPolicy: z.enum(["random", "best-fit"]),
  negotiationStrategyBuyer: z.enum(["aggressive", "fair", "opportunistic"]),
  negotiationStrategySeller: z.enum(["aggressive", "fair", "opportunistic"]),
  seed: z.number().int(),
});

module.exports = { scenarioSchema };
