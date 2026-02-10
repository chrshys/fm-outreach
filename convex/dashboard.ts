import { query } from "./_generated/server";
import { countByStatus } from "./lib/pipelineStats";

export const pipelineStats = query({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").collect();
    return countByStatus(leads);
  },
});
