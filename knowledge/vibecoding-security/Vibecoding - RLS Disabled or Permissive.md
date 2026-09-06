---
tags: [security, vibecoding, supabase, owasp-a01]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# RLS Disabled or Permissive

Entry-point note. Canonical deep-dive lives in [[Vibecoding - Supabase RLS Audit Patterns]]; SECURITY DEFINER bypass mechanics in [[Vibecoding - SECURITY DEFINER Footguns]].

## TL;DR
Supabase tables ship with RLS off, or with `USING (true)` policies that grant any authenticated user full read/write. Path of least resistance for both the Supabase scaffold AND the model resolving an RLS-denied error.

## Real-world impact
- Lovable CVE-2025-48757: see [[Vibecoding - Case Study Lovable RLS CVE]]
- Multi-platform sweep numbers: see [[Vibecoding - Case Study Bolt and Multi-Platform Scans]]
