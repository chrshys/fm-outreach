import type { QueryCtx, MutationCtx } from "../_generated/server"

type DbCtx = Pick<QueryCtx, "db"> | Pick<MutationCtx, "db">

export async function getSetting(
  ctx: DbCtx,
  key: string,
): Promise<string | null> {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", key))
    .unique()
  return row?.value ?? null
}
