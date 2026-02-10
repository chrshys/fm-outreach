import { internalMutation } from "../_generated/server";

export const defaultTemplates = [
  {
    name: "Cold Intro — Farm",
    sequenceType: "initial" as const,
    subject: "{{farmName}} + Fruitland Market",
    prompt: `Write a warm cold outreach email from Fruitland Market to a local farm or food producer in Ontario.

Lead details:
- Farm name: {{farmName}}
- Contact name: {{contactName}}
- City: {{city}}
- Products: {{products}}
- Sales channels: {{salesChannels}}
- Sells online: {{sellsOnline}}
- Farm description: {{farmDescription}}
- Social links: {{socialLinks}}

Guidelines:
- 50-125 words
- Tone: warm, rural/local-focused, neighbor-to-neighbor — NOT salesy
- Reference at least one specific detail about the farm (products, location, markets they attend)
- Mention Fruitland Market as a new way to reach local customers online
- End with a soft call to action (not a hard meeting ask)
- Use ONLY verified data from the lead details above — never invent facts
- If contact name is available, address them by first name
- Keep it conversational, like a neighbor reaching out`,
    isDefault: true,
  },
  {
    name: "Follow-up 1 — Social Proof",
    sequenceType: "follow_up_1" as const,
    subject: "Re: {{farmName}} + Fruitland Market",
    prompt: `Write a follow-up email (day 3-4) from Fruitland Market to a local farm or food producer who hasn't replied to the initial outreach.

Lead details:
- Farm name: {{farmName}}
- Contact name: {{contactName}}
- City: {{city}}
- Products: {{products}}
- Sales channels: {{salesChannels}}
- Sells online: {{sellsOnline}}
- Farm description: {{farmDescription}}
- Social links: {{socialLinks}}

Guidelines:
- 50-125 words
- Take a DIFFERENT angle from the initial email — focus on social proof
- Mention other local farms in the area already using Fruitland Market (e.g., "12 other Niagara farms are already on Fruitland Market")
- Tone: warm, helpful, not pushy
- Reference a specific benefit relevant to their current sales channels
- If they sell at farmers' markets, mention reaching customers beyond market hours
- If they don't sell online, mention how easy it is to get started
- End with a low-pressure question or offer
- Use ONLY verified data — never invent facts`,
    isDefault: true,
  },
  {
    name: "Follow-up 2 — Quick Check-in",
    sequenceType: "follow_up_2" as const,
    subject: "Re: {{farmName}} + Fruitland Market",
    prompt: `Write a brief follow-up email (day 7-8) from Fruitland Market to a local farm or food producer who hasn't replied to previous emails.

Lead details:
- Farm name: {{farmName}}
- Contact name: {{contactName}}
- City: {{city}}
- Products: {{products}}
- Sales channels: {{salesChannels}}
- Sells online: {{sellsOnline}}
- Farm description: {{farmDescription}}
- Social links: {{socialLinks}}

Guidelines:
- 40-80 words — keep it SHORT
- Tone: casual, genuinely helpful
- Don't repeat points from previous emails
- Offer to help with something specific (e.g., "happy to set up your page for you" or "can send over some info about how it works")
- Ask a simple yes/no question to make replying easy
- Use ONLY verified data — never invent facts`,
    isDefault: true,
  },
  {
    name: "Follow-up 3 — Breakup",
    sequenceType: "follow_up_3" as const,
    subject: "Re: {{farmName}} + Fruitland Market",
    prompt: `Write a final "breakup" email (day 14) from Fruitland Market to a local farm or food producer who hasn't replied to any previous emails.

Lead details:
- Farm name: {{farmName}}
- Contact name: {{contactName}}
- City: {{city}}
- Products: {{products}}
- Sales channels: {{salesChannels}}
- Sells online: {{sellsOnline}}
- Farm description: {{farmDescription}}
- Social links: {{socialLinks}}

Guidelines:
- 30-60 words — very short
- Tone: respectful, no guilt — just leaving the door open
- Acknowledge they're busy (it's farming season, etc.)
- Let them know the offer stands whenever they're ready
- Don't summarize previous emails or re-pitch
- Simple sign-off that feels human
- Use ONLY verified data — never invent facts`,
    isDefault: true,
  },
] as const;

export const seedTemplates = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("emailTemplates").collect();

    let inserted = 0;
    let skipped = 0;

    for (const template of defaultTemplates) {
      const alreadyExists = existing.some(
        (t) =>
          t.name === template.name && t.sequenceType === template.sequenceType,
      );

      if (alreadyExists) {
        skipped += 1;
        continue;
      }

      if (template.isDefault) {
        const currentDefault = existing.find(
          (t) => t.sequenceType === template.sequenceType && t.isDefault,
        );
        if (currentDefault) {
          await ctx.db.patch(currentDefault._id, { isDefault: false });
        }
      }

      await ctx.db.insert("emailTemplates", {
        name: template.name,
        sequenceType: template.sequenceType,
        prompt: template.prompt,
        subject: template.subject,
        isDefault: template.isDefault,
      });
      inserted += 1;
    }

    return { inserted, skipped };
  },
});
