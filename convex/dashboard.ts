import { query } from "./_generated/server";
import { aggregateEmailStats } from "./lib/emailStats";
import { countByStatus } from "./lib/pipelineStats";
import { aggregateSocialStats } from "./lib/socialStats";

export const pipelineStats = query({
  args: {},
  handler: async (ctx) => {
    const leads = await ctx.db.query("leads").collect();
    return countByStatus(leads);
  },
});

export const emailStats = query({
  args: {},
  handler: async (ctx) => {
    const emails = await ctx.db.query("emails").collect();
    return aggregateEmailStats(emails, Date.now());
  },
});

export const socialStats = query({
  args: {},
  handler: async (ctx) => {
    const activities = await ctx.db.query("activities").collect();
    return aggregateSocialStats(activities, Date.now());
  },
});
