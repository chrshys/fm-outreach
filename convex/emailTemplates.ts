import { query } from "./_generated/server"

const SEQUENCE_ORDER = ["initial", "follow_up_1", "follow_up_2", "follow_up_3"] as const

export const list = query({
  args: {},
  handler: async (ctx) => {
    const templates = await ctx.db.query("emailTemplates").collect()
    return templates.sort(
      (a, b) =>
        SEQUENCE_ORDER.indexOf(a.sequenceType) -
        SEQUENCE_ORDER.indexOf(b.sequenceType),
    )
  },
})
