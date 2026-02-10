# Phase 11: CLI Skills

Power-user terminal operations via Claude Code skills. After this phase: you can run lead discovery, enrichment, email generation, and stats from the terminal without opening the web UI.

> **Prerequisites:** Phases 1-8 completed (all backend actions exist)

## Boundaries

- DO NOT duplicate backend logic — CLI skills call existing Convex actions
- DO NOT add new Convex actions — reuse what exists from prior phases
- DO NOT build a separate CLI binary — these are Claude Code skills (markdown files in `.claude/skills/`)

## Tasks

- [ ] Create Claude Code skill `/discover-leads` at `.claude/skills/discover-leads.md` — skill that takes a region name (e.g., "Niagara"), runs the lead discovery sources (Google Places search for farms in the region), and prints results: new leads found, duplicates skipped, total in database. Uses existing Convex actions via the Convex CLI or HTTP API.
- [ ] Create Claude Code skill `/enrich-leads` at `.claude/skills/enrich-leads.md` — skill that takes a cluster name or filter (e.g., "Niagara" or "status:new_lead"), finds matching leads, runs batch enrichment, and prints results: leads enriched, emails found, no-email leads, errors.
- [ ] Create Claude Code skill `/import-csv` at `.claude/skills/import-csv.md` — skill that takes a CSV file path, reads it, runs the seed mutation, and prints import results: inserted, skipped, duplicated.
- [ ] Create Claude Code skill `/outreach-stats` at `.claude/skills/outreach-stats.md` — skill that queries the dashboard aggregate queries and prints a formatted terminal report: pipeline funnel, email stats (7d/30d), social stats, active campaigns, follow-ups due.
- [ ] Create Claude Code skill `/generate-email` at `.claude/skills/generate-email.md` — skill that takes a lead name or ID, generates a personalized email using the default initial template, and prints the subject + body to terminal for review.
- [ ] Create Claude Code skill `/campaign-status` at `.claude/skills/campaign-status.md` — skill that queries active campaigns and prints: campaign name, status, lead count, sent/opened/replied/bounced stats, last sync time.

## Validation

- [ ] Each skill file exists in `.claude/skills/` with clear instructions
- [ ] `/outreach-stats` prints readable pipeline and email statistics
- [ ] `/generate-email` for a known lead produces a personalized email preview
- [ ] `/campaign-status` shows current campaign data
- [ ] Skills reference existing Convex actions (no new backend code needed)
