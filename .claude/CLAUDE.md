# Fruitland Market - Claude Code Instructions

## Ralphy

Ralphy is an autonomous CLI that orchestrates AI coding agents to work through task lists. When I say "run ralphy" or "ralphy loop", I mean using this tool to process tasks from a markdown file.

### Key Commands

```bash
# Single task
ralphy "add login button"

# Process task list (most common usage)
ralphy --prd docs/26-02-05-n01-fruitland-market-ui-tasklist.md

# Parallel execution (multiple agents)
ralphy --prd tasks.md --parallel

# Create branches and PRs per task
ralphy --prd tasks.md --branch-per-task --create-pr

# Skip tests/lint for speed
ralphy --prd tasks.md --fast

# Use specific AI engine
ralphy --cursor "fix bug"
ralphy --copilot "add feature"
```

### Writing Effective Task Lists

Ralphy works best with clear, discrete, testable tasks. Each iteration starts fresh—progress persists in files and git, not in context.

#### Task Sizing

Each task should be completable in one context window (5-15 minutes of work). If a task is too big, the agent loses context before finishing. Split big work into phases.

**Too big:**
```markdown
- [ ] Build the checkout flow
```

**Right size:**
```markdown
- [ ] Add checkout page route at /checkout
- [ ] Create CheckoutForm component with cart summary
- [ ] Wire CheckoutForm to Stripe checkout session
- [ ] Add success/cancel redirect pages
```

#### Validation Criteria

Every section needs objective, verifiable success signals. The agent needs concrete proof of completion—fuzzy goals cause thrashing.

**Bad:** "Make the feed look better"
**Good:** "Feed cards show seller avatar, price, and distance badge"

Structure task lists with validation gates:

```markdown
## 1. Listing Detail Page

### Tasks
- [ ] Create /listings/[id] route
- [ ] Add photo gallery component
- [ ] Display seller card with follow button
- [ ] Show pickup location

### Validation
- [ ] Route renders without errors
- [ ] Gallery displays multiple photos with thumbnails
- [ ] Clicking seller card navigates to /@username
- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
```

#### Task Descriptions

Be specific and actionable:

| Vague | Specific |
|-------|----------|
| Add auth | Add Clerk SignIn component to /login route |
| Fix the bug | Handle null seller in FeedCard gracefully |
| Improve performance | Add React.memo to ListingCard component |
| Make it responsive | Add mobile breakpoint to grid (1 col < 640px) |

#### Boundaries

Explicitly state what NOT to touch. AI cannot infer scope from omission:

```markdown
## Boundaries
- DO NOT modify packages/backend/convex/schema.ts
- DO NOT add new dependencies without approval
- DO NOT change existing API contracts
```

#### Task File Format

Ralphy reads markdown checkbox lists:
```markdown
## Tasks
- [ ] create auth        # pending - will be executed
- [ ] add dashboard      # pending
- [x] setup project      # completed - skipped
```

### Project Config

Config lives in `.ralphy/config.yaml`. Initialize with:
```bash
ralphy --init
```

### Useful Flags

| Flag | Purpose |
|------|---------|
| `--prd PATH` | Task file or folder |
| `--parallel` | Run multiple agents concurrently |
| `--branch-per-task` | One branch per task |
| `--create-pr` | Auto-create pull requests |
| `--fast` | Skip tests and lint |
| `--dry-run` | Preview without executing |
| `-v` | Verbose/debug output |

### Learn More

- GitHub: https://github.com/michaelshimeles/ralphy
- Discord: https://discord.gg/SZZV74mCuV

## Test Discipline

After every code change, check for tests that cover the modified code (`tests/` directory). If a test exists:
- If the change is intentional (new behavior, refactor, state management change), update the test to match the new code and preserve meaningful coverage.
- If the test reveals the change broke something unintentionally, fix the code instead.
- Tests in this project are source-code pattern-matching (regex against file contents), so renaming variables, changing state management patterns, or restructuring code will break assertions — always check.
- Never delete or weaken a test just to make it pass. The test should remain meaningful.
- Run `node --test tests/` after changes to confirm tests pass.

## UI/UX Design Rules

### Visual Treatment
- No glassmorphism — use solid backgrounds (`bg-card`, `bg-popover`), never `backdrop-blur` or opacity suffixes like `/85`

### Typography
- **Page titles (h1):** `text-2xl font-bold tracking-tight` — consistent across all app pages
- **Section headings (h2):** `text-xl font-semibold mb-4`
- **CardTitle default:** `text-lg` — don't override with `className="text-lg"`, it's the default

### Card Defaults
- **CardHeader:** `p-4` (not `p-6`)
- **CardContent:** `p-4 pt-0` (not `p-6 pt-0`)
- Don't pass redundant `className="p-4"` to CardHeader/CardContent

### Layout & Spacing
- **AppLayout owns the container** — pages should NOT wrap content in `min-h-screen py-12 px-4` or use `mx-auto` (AppLayout already centers via `items-center`)
- **Page width constraints:** Use `w-full max-w-{size}` (not `max-w-{size} mx-auto`)
  - Narrow pages: `max-w-2xl`
  - Focused flows (forms, setup): `max-w-xl` or `max-w-md`
  - Listing detail: full layout-container width
  - Static pages: `max-w-2xl`
- **Loading/error states:** `flex items-center justify-center py-12` (not `min-h-screen flex items-center justify-center`)
- **Section spacing:** `space-y-8` between major sections — not `space-y-10` or `space-y-12`
