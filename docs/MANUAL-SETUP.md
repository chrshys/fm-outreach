# FM Outreach — Manual Setup Steps

Manual steps required before/between ralphy phases. Do these in order as you reach each phase.

---

## Before Phase 1: Foundation

### 1. Create the Next.js project

```bash
cd ~/Projects/fm-outreach
pnpm create next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack
```

> If the directory isn't empty, move `docs/`, `data/`, `mockup/`, `.claude/`, `.ralphy/` out, create the project, then move them back. Or use `--no-git` and merge manually.

### 2. Initialize Convex

```bash
pnpm add convex
npx convex dev
```

This is interactive — you'll log in to Convex, create/select a project (`fm-outreach`), and it generates `convex/` directory with config files.

### 3. Install shadcn/ui

```bash
pnpm dlx shadcn@latest init
```

Select: New York style, Zinc base color, CSS variables: yes.

Then install core components:

```bash
pnpm dlx shadcn@latest add button card table input textarea select badge dialog dropdown-menu separator tabs tooltip sheet popover command checkbox label
```

### 4. Install additional dependencies

```bash
pnpm add lucide-react date-fns
```

### 5. Verify it runs

```bash
pnpm dev
# In another terminal:
npx convex dev
```

You should see the Next.js welcome page at `localhost:3000` and Convex syncing in the other terminal.

---

## Before Phase 2: Seed Data

### 1. Google Geocoding API key

- Go to [Google Cloud Console](https://console.cloud.google.com/)
- Enable the Geocoding API
- Create or reuse an API key (you may already have one from FM)
- Set it as a Convex environment variable:

```bash
npx convex env set GOOGLE_GEOCODING_API_KEY "your-key-here"
```

---

## Before Phase 5: Settings

No manual steps. Settings page stores keys in a Convex `settings` table (not env vars) so they're editable from the UI. API keys that Convex actions need server-side are set separately as Convex env vars (done in later manual steps).

---

## Before Phase 6: Enrichment

### 1. Google Places API key

- Same Google Cloud project — enable the Places API (New)
- Set as Convex env var:

```bash
npx convex env set GOOGLE_PLACES_API_KEY "your-key-here"
```

### 2. Anthropic API key

- Get from [console.anthropic.com](https://console.anthropic.com/)
- Set as Convex env var:

```bash
npx convex env set ANTHROPIC_API_KEY "your-key-here"
```

### 3. Hunter.io API key (optional)

- Sign up at [hunter.io](https://hunter.io/) — free tier gives 25 searches/month
- Set as Convex env var:

```bash
npx convex env set HUNTER_API_KEY "your-key-here"
```

---

## Before Phase 7: Email System (Smartlead)

This is the biggest manual setup block. Start this 2-4 weeks before you plan to send emails — warmup takes time.

### 1. Purchase outreach domain

- Buy a lookalike domain (e.g., `fruitlandmkt.com`) from your registrar
- Do NOT use `fruitlandmarket.com` for cold outreach

### 2. Set up Google Workspace on the outreach domain

- Go to [workspace.google.com](https://workspace.google.com/)
- Create a Workspace account on the outreach domain ($7.20/mo)
- Create your sending email (e.g., `chris@fruitlandmkt.com`)

### 3. Configure DNS (SPF/DKIM/DMARC)

In your domain's DNS settings:

**SPF record** (TXT on `@`):
```
v=spf1 include:_spf.google.com ~all
```

**DKIM** — Follow Google Workspace Admin → Apps → Gmail → Authenticate email → Generate DKIM key. Add the TXT record they give you.

**DMARC record** (TXT on `_dmarc`):
```
v=DMARC1; p=none; rua=mailto:dmarc@fruitlandmkt.com
```

### 4. Sign up for Smartlead

- Go to [smartlead.ai](https://smartlead.ai/) — Basic plan ($39/mo)
- Get your API key from Settings → API
- Connect your Google Workspace email account in Smartlead
- Start the warmup process (2-4 weeks)
- Set as Convex env var:

```bash
npx convex env set SMARTLEAD_API_KEY "your-key-here"
```

### 5. Configure Smartlead webhook

After deploying the Phase 7 webhook endpoint:

- In Smartlead → Settings → Webhooks
- Add webhook URL: `https://your-convex-deployment.convex.site/smartlead-webhook`
- Enable events: `EMAIL_SENT`, `EMAIL_OPEN`, `EMAIL_LINK_CLICK`, `EMAIL_REPLY`, `LEAD_UNSUBSCRIBED`, `LEAD_CATEGORY_UPDATED`

---

## Summary: When You Need What

| Phase | Manual Steps Required |
|-------|----------------------|
| 1 — Foundation | Create Next.js project, init Convex, install shadcn/ui |
| 2 — Seed Data | Google Geocoding API key |
| 3 — Leads CRM | None |
| 4 — Map & Clusters | None |
| 5 — Settings | None |
| 6 — Enrichment | Google Places API key, Anthropic API key, Hunter.io key (optional) |
| 7 — Email System | Outreach domain, Google Workspace, DNS, Smartlead account + warmup, webhook config |
| 8 — Campaigns | None |
| 9 — Social Outreach | None |
| 10 — Dashboard | None |
| 11 — CLI Skills | None |
