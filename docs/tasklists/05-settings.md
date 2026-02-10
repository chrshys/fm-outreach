# Phase 5: Settings & API Configuration

Store API keys and sender info so downstream features (enrichment, email) work. After this phase: you can enter and save API keys and sender identity from the UI, and Convex actions can read them.

> **Prerequisites:** Phase 1 completed

## Boundaries

- DO NOT build any enrichment or email functionality — just the storage and settings UI
- DO NOT store API keys in browser localStorage — use Convex backend storage
- DO NOT add environment variable management UI — env vars are set via `npx convex env set` for server-side secrets. The settings table stores non-secret configuration and sender info.

## Tasks

- [ ] Add a `settings` table to the Convex schema in `convex/schema.ts` — single-row key-value design: `{ key: string, value: string }` with index on `key`. Keys will be things like `sender_name`, `sender_email`, `sender_address`, `email_signature`, `smartlead_api_key`, `google_places_api_key`, `hunter_api_key`, `anthropic_api_key`.
- [ ] Create Convex query `convex/settings.ts:get` — takes a key, returns the value (or null).
- [ ] Create Convex query `convex/settings.ts:getAll` — returns all settings as a key-value object.
- [ ] Create Convex mutation `convex/settings.ts:set` — takes `{ key, value }`, upserts the setting.
- [ ] Create Convex mutation `convex/settings.ts:setBatch` — takes array of `{ key, value }` pairs, upserts all.
- [ ] Create Convex internal helper `convex/lib/getSettings.ts` — server-side helper that reads a setting value within a Convex action/mutation context. Used by enrichment, Smartlead, and email generation actions later.
- [ ] Create settings page at `src/app/settings/page.tsx` — replace placeholder. Two-card layout matching the mockup. Left card: "API Keys" with form fields for Smartlead API Key, Google Places API Key, Hunter.io API Key, Anthropic API Key. All fields are password-type inputs with show/hide toggle. Right card: "Sender Identity" with fields for Sender Name, Sender Email, Mailing Address (required for CASL), Email Signature (textarea). Save button at bottom of each card. Load existing values on mount.
- [ ] Add form validation — Sender Name, Sender Email, and Mailing Address are required (show inline error if empty on save). API keys are optional (show "Not configured" indicator if empty).
- [ ] Add outreach domain documentation section — below the two cards, add a read-only card titled "Domain Configuration" with a checklist: SPF record configured, DKIM configured, DMARC configured, Warmup period complete. These are informational only (not editable) — they remind the user what needs to be done manually before sending.

## Validation

- [ ] Settings page renders with two form cards and documentation section
- [ ] Entering and saving API keys persists to Convex (verify in Convex dashboard)
- [ ] Reloading the settings page shows previously saved values
- [ ] Password fields are masked by default, show/hide toggle works
- [ ] Saving sender info without required fields shows validation errors
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
