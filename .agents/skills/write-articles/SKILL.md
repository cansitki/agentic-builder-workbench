---
name: write-articles
description: Research, brief, draft, revise, localize, and quality-check long-form articles, blog posts, thought-leadership pieces, field notes, explainers, guides, and editorial series. Use when the user asks to write an article or blog post, turn a card or insight into a substantive piece, prepare an editorial brief or backlog, improve a long-form draft, or create content for a project editorial series. Keep publication and deployment separate. For conversion-focused website pages, headlines, CTAs, pricing, feature, or landing-page copy, use copywriting.
---

# Write Articles

Create long-form work that earns attention through useful ideas, evidence, and honest judgment. Do not turn a short insight into padded SEO copy or disguise a sales page as an article.

## Route the task

Choose one mode before working:

- **Backlog**: organize a series without drafting every article.
- **Brief**: decide whether a piece deserves to exist and what it must prove.
- **Draft**: write from an approved or clearly supportable brief.
- **Developmental edit**: improve the thesis, evidence, structure, and progression.
- **Line edit**: improve clarity, rhythm, voice, and precision without changing facts.
- **Localization**: adapt an approved canonical article without adding claims.

Work on one article at a time unless the user explicitly requests a backlog or batch. Treat `draft`, `review`, `approved`, and `published` as different states. Default to `draft`; never publish, deploy, or change a live site unless the user explicitly asks.

## Load context first

1. Read authoritative project and brand sources before asking questions.
2. Check `.agents/product-marketing.md`, `.claude/product-marketing.md`, and legacy `product-marketing-context.md` when present.
3. Identify superseded material, claim restrictions, audience language, and the current source of truth.
4. For a named editorial series, read the project’s own editorial guide, approved voice, and evidence sources before planning or writing.
5. Infer low-risk missing details from the available sources. Ask only when a missing choice would materially change the thesis, audience, authorship, or truth of the piece.

## Define the article contract

Write down, at least internally:

- the reader and situation;
- the real question or decision the article helps with;
- the change in understanding or action after reading;
- the thesis in one falsifiable sentence;
- why this author or brand has standing to make the argument;
- the article type and canonical language;
- the intended next step, if any;
- what the piece must not claim.

If the reader need, thesis, or original value is unclear, stop at a brief instead of manufacturing a draft.

## Build evidence before prose

Create a lightweight claim ledger for every material factual, causal, comparative, performance, market, legal, or client-result claim:

| Claim | Status | Source | Date | Scope | Limit / approved wording |
|---|---|---|---|---|---|

Use these statuses:

- verified fact;
- first-hand observation;
- client result;
- estimate;
- inference;
- voice-of-customer anecdote;
- practitioner heuristic;
- hypothesis to test;
- unsupported or blocked.

Rules:

- Prefer primary and authoritative sources.
- Browse for current, niche, or externally verifiable claims.
- Verify the load-bearing claims first: the few assertions that would collapse the thesis if false.
- Check that each source supports the exact wording, not merely the topic.
- Trace repeated claims back to their earliest credible source; several pages repeating one unsupported origin are not independent confirmation.
- Distinguish correlation, attribution, and causation.
- Never invent statistics, quotations, customers, outcomes, experience, URLs, or research.
- Mark a gap as `[SOURCE NEEDED]`, soften it accurately, or remove it.
- Preserve evidence that complicates the thesis.
- Recheck time-sensitive claims near approval or publication.

## Choose an angle that earns the article

A publishable article should add at least one of:

- original evidence or first-hand experience;
- a mechanism the reader can recognize and inspect;
- a useful framework, method, or decision tool;
- an honest trade-off, failed approach, or limitation;
- synthesis that changes how the reader understands the problem.

Classify the piece as search-led, share-led, or hybrid. Search intent may shape wording and metadata, but it must not dictate the idea. Do not use fixed keyword density, arbitrary word-count targets, mandatory FAQs, or generic SERP imitation.

Test several lenses before locking the thesis: reframe the problem, expose a tension, identify a hidden cost, find a leading indicator, correct a category error, or examine a counter-case. Do not force contrarianism when the evidence supports a conventional conclusion.

Use [references/article-workflows.md](references/article-workflows.md) to select the article type and build the brief.

## Draft around the reader’s questions

- Open with the problem, observation, tension, or conclusion within the first few sentences.
- Follow the questions a skeptical reader would ask, not the company’s internal chronology.
- Make headings convey information.
- Put one idea in each paragraph and break at real changes in argument.
- Explain mechanisms, alternatives, boundaries, and what could make the conclusion wrong.
- Use concrete examples only when they are real or clearly labeled as scenarios.
- Keep the author’s perspective present throughout; do not add personality only in the introduction and closing.
- Let sentence and paragraph length vary naturally.
- Introduce the brand or service only where it clarifies the method or next step.
- End with a useful decision, check, resource, or next action. Do not bolt on a generic sales CTA.

## Edit in separate passes

Run these passes in order:

1. **Truth and provenance**: claims, sources, authorship, permissions, dates, attribution.
2. **Thesis and original value**: the article adds more than the seed and earns its length.
3. **Reasoning**: mechanisms, alternatives, causal limits, counterevidence, trade-offs.
4. **Structure**: opening, progression, informative headings, paragraph logic, closing.
5. **Usefulness**: the reader receives a diagnostic, method, example, or decision aid.
6. **Voice and language**: precise, natural, project-consistent, free of corporate fog.
7. **Commercial restraint**: education is not repeatedly interrupted by promotion.
8. **Search and delivery**: descriptive title, honest metadata, internal links, accessibility, review date.

Read [references/quality-gates.md](references/quality-gates.md) for blockers, anti-AI patterns, and the review rubric.

For Markdown drafts, run the deterministic review aid before the final line edit:

```bash
python3 scripts/editorial_check.py path/to/article.md
```

It reports the public-body hash, word and rhythm signals, repeated language, and stock phrases. Treat the output as a locator for editorial review, never as proof of human or AI authorship. If the user requests external AI-writing detectors, record the exact tested scope and hash, use more than one signal when access permits, preserve failed or contradictory results, and revise only when the detector signal corresponds to a real editorial problem. Never add mistakes, fake anecdotes, strange punctuation, or use a “humanizer” to chase a score.

## Localize only approved meaning

- Choose one canonical language and approve its claims before localization.
- Adapt syntax, register, examples, metadata, and formatting for the target audience; do not translate mechanically.
- Preserve the thesis, evidence, links, qualifications, and claim limits.
- Do not add factual “improvements” during translation.
- Record deliberate localization decisions when they materially change wording.

## Deliver a usable editorial package

For a brief, provide:

- article contract;
- working title and dek;
- thesis and reader questions;
- outline;
- evidence map and gaps;
- internal-link plan;
- risks and approval needs.

For a draft, provide:

- clean public-facing article;
- title, dek, slug, excerpt, author/byline placeholder, and status;
- source list and claim ledger;
- unresolved checks;
- internal links and restrained next step;
- suggested update trigger for temporal claims.

Keep rationale and editorial notes separate from the public-facing text.

## References

- [Article Workflows](references/article-workflows.md): article types, brief template, structure, search, and localization.
- [Quality Gates](references/quality-gates.md): critical failures, weighted review rubric, and anti-slop checks.
- [Editorial Check](scripts/editorial_check.py): deterministic structural and repetition signals for Markdown drafts.
