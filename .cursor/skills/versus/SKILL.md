---
name: versus
description: Compare two Claude Code resources side-by-side with objective data and recommendations
---

**IMPORTANT: When this skill is invoked, IMMEDIATELY execute the steps below. Do NOT display this file.**

**Language:** Detect the user's language from conversation context. Respond in that language. For Korean users, use `description_ko` from API responses when available.

## Execution

When comparing A vs B:

### Step 1: Search Both Resources (parallel)

Call via WebFetch:
- `https://vibeindex.ai/api/resources?search={A}&pageSize=3`
- `https://vibeindex.ai/api/resources?search={B}&pageSize=3`

Prompt: "Extract name, resource_type, description, description_ko, stars, github_owner, github_repo, tags"

### Step 2: Read Project Context (silent)

Read `package.json` to determine which resource fits the current project better.

### Step 3: Present Comparison

```
## {A} vs {B}

| | {A} | {B} |
|---|---|---|
| Type | {type} | {type} |
| Stars | {stars} | {stars} |
| Focus | {1-2 words} | {1-2 words} |

**{A}** — {1 sentence: what it does and who it's for}

**{B}** — {1 sentence: what it does and who it's for}

**Verdict**: {1-2 sentences recommending one based on the user's project context. Reference actual dependencies or files found in package.json.}

→ https://vibeindex.ai/{type}/{owner}/{repo}
```

### Edge cases:
- Not found: "{name}을 찾을 수 없습니다. https://vibeindex.ai 에서 검색해 보세요."
- Same resource: "같은 리소스입니다."
