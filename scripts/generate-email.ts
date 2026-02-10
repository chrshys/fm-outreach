/**
 * Generate a personalized outreach email for a lead using the default initial template.
 *
 * Run with: npx tsx scripts/generate-email.ts <lead-name-or-id>
 *
 * Examples:
 *   npx tsx scripts/generate-email.ts "Niagara Farms"
 *   npx tsx scripts/generate-email.ts jh7abc123def456
 */
import { ConvexHttpClient } from "convex/browser";

import { api } from "../convex/_generated/api";

function getConvexUrl(): string {
  const convexUrl = process.env.CONVEX_URL ?? process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    throw new Error("Missing CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable");
  }
  return convexUrl;
}

type LeadSummary = {
  _id: string;
  name: string;
  city: string;
  status: string;
  contactEmail?: string;
};

type EmailTemplate = {
  _id: string;
  name: string;
  sequenceType: string;
  isDefault: boolean;
};

type GeneratedEmail = {
  subject: string;
  body: string;
};

async function main(): Promise<void> {
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: npx tsx scripts/generate-email.ts <lead-name-or-id>");
    console.error("");
    console.error("Examples:");
    console.error('  npx tsx scripts/generate-email.ts "Niagara Farms"');
    console.error("  npx tsx scripts/generate-email.ts jh7abc123def456");
    process.exitCode = 1;
    return;
  }

  const convex = new ConvexHttpClient(getConvexUrl());

  // Resolve lead — try search by name first, fall back to direct ID lookup
  let leadId: string;
  let leadName: string;

  const searchRef = api.leads.search;
  const searchResults: LeadSummary[] = await convex.query(searchRef, { text: input });

  if (searchResults.length > 0) {
    // Use the first search result
    const lead = searchResults[0];
    leadId = lead._id;
    leadName = lead.name;

    if (searchResults.length > 1) {
      console.log(`Found ${searchResults.length} leads matching "${input}" — using first match.\n`);
      for (const result of searchResults.slice(0, 5)) {
        console.log(`  ${result._id}  ${result.name} (${result.city})`);
      }
      if (searchResults.length > 5) {
        console.log(`  ... and ${searchResults.length - 5} more`);
      }
      console.log("");
    }
  } else {
    // Try as a direct Convex document ID
    try {
      const getRef = api.leads.get;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- CLI script passes runtime string as Convex Id
      const lead = await convex.query(getRef, { leadId: input as any });
      if (!lead) {
        console.error(`No lead found matching "${input}".`);
        process.exitCode = 1;
        return;
      }
      leadId = lead._id;
      leadName = lead.name;
    } catch {
      console.error(`No lead found matching "${input}".`);
      process.exitCode = 1;
      return;
    }
  }

  // Find the default initial template
  const listRef = api.emailTemplates.list;
  const templates: EmailTemplate[] = await convex.query(listRef, {});
  const initialTemplate = templates.find(
    (t) => t.sequenceType === "initial" && t.isDefault,
  );

  if (!initialTemplate) {
    console.error("No default initial email template found. Run template seeding first.");
    process.exitCode = 1;
    return;
  }

  console.log(`Generating email for "${leadName}"...\n`);

  const generateRef = api.email.generateEmail.generateEmail;
  /* eslint-disable @typescript-eslint/no-explicit-any -- CLI script passes runtime strings as Convex Ids */
  const result: GeneratedEmail = await convex.action(generateRef, {
    leadId: leadId as any,
    templateId: initialTemplate._id as any,
  });
  /* eslint-enable @typescript-eslint/no-explicit-any */

  console.log("Subject: " + result.subject);
  console.log("---");
  console.log(result.body);
}

main().catch((error: unknown) => {
  console.error("Email generation failed:", error);
  process.exitCode = 1;
});
