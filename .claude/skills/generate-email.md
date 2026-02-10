# /generate-email

Generate a personalized outreach email for a lead using the default initial template and print the subject + body to the terminal for review.

## Usage

The user provides a lead name (e.g., "Niagara Farms") or a Convex document ID. The script searches for the lead, finds the default initial email template, generates a personalized email via Claude, and prints it.

## Steps

1. Parse the lead name or ID from the user's message. If not provided, ask for it.
2. Run the generate-email script via the CLI:

```bash
npx tsx scripts/generate-email.ts "<lead-name-or-id>"
```

This script:
- Searches for the lead by name (or looks up by ID if no search match)
- Finds the default "initial" email template
- Calls the `generateEmail` Convex action which uses a two-stage Claude pipeline (Haiku for analysis, Sonnet for generation)
- Prints the subject and body to the terminal

3. Show the generated email to the user for review.

## Examples

User: "generate email for Niagara Farms"
```bash
npx tsx scripts/generate-email.ts "Niagara Farms"
```

User: "write an outreach email for jh7abc123def456"
```bash
npx tsx scripts/generate-email.ts jh7abc123def456
```

User: "draft email for Green Acres"
```bash
npx tsx scripts/generate-email.ts "Green Acres"
```

## Requirements

- `CONVEX_URL` or `NEXT_PUBLIC_CONVEX_URL` environment variable must be set
- `ANTHROPIC_API_KEY` must be configured in Convex environment variables
- Default initial email template must be seeded (run template seeding if not)

## Convex Action

The backend action is at `convex/email/generateEmail.ts`:
- **`generateEmail`** (public action): Takes `leadId` (Id<"leads">) and `templateId` (Id<"emailTemplates">). Returns `{ subject, body }`.
- Uses two-stage Claude generation: Haiku for lead analysis, Sonnet for email composition.
- Appends CASL compliance footer automatically.
- Validates word count (50-125 words, excluding footer).
