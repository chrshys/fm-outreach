import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "sync-smartlead-analytics",
  { hours: 6 },
  internal.smartlead.analyticsCron.syncAnalytics,
);

export default crons;
