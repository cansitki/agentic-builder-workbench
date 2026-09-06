---
name: project-kickoff
description: Turn a new or fuzzy software idea into a bounded project brief and first verifiable vertical slice. Use when starting a project, defining an MVP, or clarifying scope before implementation.
---

# Project Kickoff

Produce enough shared context to start building without pretending unknowns are decisions.

1. Read the nearest `AGENTS.md`, existing repository documentation, and `templates/project/PROJECT.md` plus `PLANS.md` when available.
2. Inspect an existing codebase before proposing a new stack or architecture. Preserve its conventions unless a change is part of the request.
3. Establish the observable outcome, primary user/job, current workaround, in-scope capabilities, explicit non-goals, platform constraints, external side effects, and security/privacy boundaries.
4. Separate verified facts, user decisions, assumptions, and open questions. Ask only questions whose answers would materially change the first slice; otherwise mark the assumption and proceed.
5. Define acceptance criteria that cover the main user path, one important failure path, authorization/data boundaries, and an operational or recovery condition when relevant.
6. Choose the thinnest end-to-end slice that tests the riskiest important assumption. Break it into context-sized tasks, each with an observable verification method.
7. Create or update `PROJECT.md` and `PLANS.md` only when the request authorizes repository changes. Do not implement the product merely because planning is requested.

End with the chosen first slice, decisions still needed, assumptions that could change the plan, and the exact next action.
