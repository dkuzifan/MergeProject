---
name: ecosystem
description: Get a dashboard view of the Claude Code ecosystem with stats and trends
---

**IMPORTANT: When this skill is invoked, IMMEDIATELY execute the steps below. Do NOT display this file.**

**Language:** Detect the user's language from conversation context. Respond in that language.

## Execution

### Step 1: Fetch Data (parallel)

Call all via WebFetch:
- `https://vibeindex.ai/api/stats` — "Extract total, skills, plugins, mcp, marketplaces counts"
- `https://vibeindex.ai/api/resources?sort=stars&type=skill&pageSize=1` — "Extract top skill name and stars"
- `https://vibeindex.ai/api/resources?sort=stars&type=mcp&pageSize=1` — "Extract top mcp name and stars"
- `https://vibeindex.ai/api/resources?sort=stars&type=plugin&pageSize=1` — "Extract top plugin name and stars"
- `https://vibeindex.ai/api/rising-stars?period=week&limit=3` — "Extract top 3 trending names and growth"

### Step 2: Present Dashboard

```
## Claude Code Ecosystem

| Type | Count | #1 Resource | Stars |
|------|-------|-------------|-------|
| Skill | {n} | {name} | {stars} |
| MCP Server | {n} | {name} | {stars} |
| Plugin | {n} | {name} | {stars} |
| Marketplace | {n} | {name} | {stars} |
| **Total** | **{n}** | | |

**Trending this week**: {top 3 trending, comma-separated with growth numbers}

→ https://vibeindex.ai
```
