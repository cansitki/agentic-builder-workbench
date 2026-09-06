---
tags: [vibecoding, security, rag, agents, research]
date: 2026-04-28
status: research
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# RAG Poisoning

**5 malicious documents poison a million-document knowledge base with 90% attack success. The data loader, not the LLM, is often the real attack surface.**

## PoisonedRAG (USENIX Security 2025)
Zou et al. demonstrated the practical lower bound:
- Inject **just 5 malicious texts** into a multi-million-doc knowledge base
- **90% attack success** against target queries
- Crafted docs match victim query's embedding while embedding the attacker's target answer

The attack is **economically viable**: 5 documents is the cost of a Wikipedia edit, a forum post, a fake StackOverflow answer.

## Hidden Threat in Plain Text (ACM AISec '25)
The RAG **data loader** — the PDF/DOCX/HTML parser — is its own attack surface, even before the LLM sees the content.

9-attack taxonomy targeting parsers:
- **Content Obfuscation** — zero-width characters, white-on-white text, font tricks invisible to humans, visible to the loader
- **Content Injection** — instructions hidden in metadata, alt text, footers parsed but not rendered

**74.4% success across 357 scenarios on six end-to-end RAG systems.**

If your app accepts user uploads (CVs, support docs, attachments) and feeds them to a RAG pipeline, the parser is the prompt-injection surface.

## Cross-tenant RAG poisoning
RAG threat-model paper (arxiv 2509.20324) formalises the **cross-tenant retrieval boundary** problem: shared vector index across users + insufficient metadata filtering = user A poisons user B's retrieval results.

Vibe-coded RAG apps almost universally use a single shared Pinecone/Weaviate/pgvector index without per-tenant namespaces. Multi-tenant SaaS RAG without per-namespace isolation is unsafe by default.

## Defenses
- **RAGForensics** (WWW '25) — first traceback system; lets you find the poisoned chunk after the fact
- Per-tenant namespaces in vector store (Pinecone namespaces, Weaviate multi-tenancy mode)
- Provenance metadata on every retrieved chunk; render to user, never just LLM
- Retrieval allowlist for high-trust queries (only retrieve from curated indices)
- Sanitization on the loader before embedding (zero-width char strip, font-color normalization)

## See also
- [[Vibecoding Security Research - Index]]
- [[Vibecoding - Indirect Prompt Injection EchoLeak]]
- [[Vibecoding - Defense Pattern Dual-LLM and CaMeL]]

## Sources
- [PoisonedRAG, USENIX '25](https://www.usenix.org/system/files/usenixsecurity25-zou-poisonedrag.pdf)
- [Hidden Threat in Plain Text](https://dl.acm.org/doi/10.1145/3733799.3762976)
- [RAG threat-model arxiv 2509.20324](https://arxiv.org/pdf/2509.20324)
- [RAGForensics, WWW '25](https://dl.acm.org/doi/10.1145/3696410.3714756)