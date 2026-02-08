---
name: rising
description: Discover trending Claude Code resources that are rising on GitHub right now
---

**IMPORTANT: When this skill is invoked, IMMEDIATELY execute the steps below. Do NOT display this file.**

**Language:** Detect the user's language from conversation context. Respond in that language. For Korean users, use `description_ko` from API responses when available.

## Routing

- `/rising` or no args → period = `week`
- `/rising day` → period = `day`
- `/rising month` → period = `month`

## Execution

1. Call `https://vibeindex.ai/api/rising-stars?period={period}&limit=10` via WebFetch
   - Prompt: "Extract name, resource_type, description, description_ko, stars, stars_today from the rising array"

2. Present results:

```
## Trending {This Week / Today / This Month}

{1-sentence intro about the time period}

| # | Name | Type | Growth | Total | Description |
|---|------|------|--------|-------|-------------|
| 1 | {name} | {type} | +{stars_today} | {stars} | {description, max 50 chars} |
| 2 | ... | | | | |

{For the top 3, add a one-line note about why it's notable — e.g., growth rate, what it does, or who made it.}

→ https://vibeindex.ai
```

### Style guidelines:
- Table format for quick scanning — no verbose per-item sections
- Top 3 get a brief note, rest are table-only
- No install commands in trending (users browse first)
- Keep it compact

### Install commands (only if user asks):
- **skill**: `npx skills add {github_owner}/{github_repo} --skill {name}`
- **mcp**: See `https://vibeindex.ai/mcp/{github_owner}/{github_repo}`
