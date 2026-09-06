---
tags: [security, vibecoding, case-study, lovable]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Case Study: Lovable RLS CVE-2025-48757

## Summary
May 2025. Researcher Matt Palmer scanned 1,645 public Lovable apps. **170** had Row Level Security misconfigured — public Supabase tables exposing 18,000+ user records (emails, names, internal data, in some cases payment metadata).

## Disclosure timeline
- April 2025: vulnerability discovered
- May 2025: CVE-2025-48757 issued
- Lovable's response: "This is a user configuration issue, not a platform bug" — pushed back on accountability
- Public outcry; Lovable later added RLS-default-on toggle for new projects

## Pattern
- Default Supabase scaffold ships with RLS off
- Lovable's AI-generated code creates tables without enabling RLS
- App reads via anon key from frontend
- Anyone with the anon key (visible in JS bundle) can query the entire table

## Lesson
Platform defaults set the security floor. "User error" is not a defense when the platform makes the insecure path the default path.

## Sources
- [Superblocks — Lovable Vulnerability: 170+ Apps Exposed](https://www.superblocks.com/blog/lovable-vulnerabilities)
- [TheNextWeb — Lovable security crisis](https://thenextweb.com/news/lovable-vibe-coding-security-crisis-exposed)
- [DEV.to — RLS audit of 50 Lovable apps](https://dev.to/tgoldi/is-lovable-actually-secure-i-checked-the-supabase-rls-on-50-apps-38o2)

Related: [[Vibecoding - RLS Disabled or Permissive]]
