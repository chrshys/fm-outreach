import { v } from "convex/values";

import { api } from "../_generated/api";
import { action } from "../_generated/server";

type ImportLeadsResult = {
  inserted: number
  skipped: number
  errored: number
}

type RunSeedResult = {
  farms: {
    inserted: number
    skipped: number
    errors: number
  }
  markets: {
    inserted: number
    skipped: number
    errors: number
  }
}

export const runSeed = action({
  args: {
    farmsCsvContent: v.string(),
    marketsCsvContent: v.string(),
    farmsFilename: v.string(),
    marketsFilename: v.string(),
  },
  handler: async (ctx, args): Promise<RunSeedResult> => {
    const farmsResult: ImportLeadsResult = await ctx.runAction(api.seeds.importLeads.importLeads, {
      csvContent: args.farmsCsvContent,
      filename: args.farmsFilename,
    });

    const marketsResult: ImportLeadsResult = await ctx.runAction(api.seeds.importLeads.importLeads, {
      csvContent: args.marketsCsvContent,
      filename: args.marketsFilename,
    });

    return {
      farms: {
        inserted: farmsResult.inserted,
        skipped: farmsResult.skipped,
        errors: farmsResult.errored,
      },
      markets: {
        inserted: marketsResult.inserted,
        skipped: marketsResult.skipped,
        errors: marketsResult.errored,
      },
    };
  },
});
