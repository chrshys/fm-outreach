import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

type SeedCtx = Pick<MutationCtx, "db">;
type NewLead = Omit<Doc<"leads">, "_id" | "_creationTime">;
type NewActivity = Omit<Doc<"activities">, "_id" | "_creationTime">;

const DEFAULT_LEAD_LOCATION = {
  address: "123 Test Lane",
  city: "Fruitland",
  region: "Niagara",
  province: "ON",
} as const;

export async function createTestLead(
  ctx: SeedCtx,
  overrides: Partial<NewLead> = {},
): Promise<Id<"leads">> {
  const now = Date.now();

  const defaultLead: NewLead = {
    name: "Test Farm",
    type: "farm",
    ...DEFAULT_LEAD_LOCATION,
    source: "manual",
    sourceDetail: "seed helper",
    status: "new_lead",
    followUpCount: 0,
    contactName: "Test Contact",
    contactEmail: "test@example.com",
    website: "https://example.com",
    socialLinks: {
      instagram: "https://instagram.com/testfarm",
      facebook: "https://facebook.com/testfarm",
    },
    createdAt: now,
    updatedAt: now,
  };

  const lead: NewLead = {
    ...defaultLead,
    ...overrides,
    socialLinks:
      overrides.socialLinks === undefined
        ? defaultLead.socialLinks
        : {
            ...defaultLead.socialLinks,
            ...overrides.socialLinks,
          },
  };

  return ctx.db.insert("leads", lead);
}

export async function createTestActivity(
  ctx: SeedCtx,
  overrides: Partial<NewActivity> = {},
): Promise<Id<"activities">> {
  const now = Date.now();
  const leadId = overrides.leadId ?? (await createTestLead(ctx));

  const activity: NewActivity = {
    leadId,
    type: "note_added",
    channel: "email",
    description: "Seed test activity",
    metadata: { source: "seed_helper" },
    createdAt: now,
    ...overrides,
  };

  return ctx.db.insert("activities", activity);
}
