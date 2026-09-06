---
tags: [security, vibecoding, validation, owasp-a03]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# No Input Validation

## What it looks like
- `req.body.email` straight into DB
- `parseInt(req.query.id)` returns NaN; SQL trips
- File upload accepts any size, any MIME type
- Numeric fields accept strings; arithmetic produces `'10' + 5 = '105'`
- Stack traces leak into 500 responses

## Why AI generates it
Happy-path bias. The model writes for a well-formed payload; malformed input wasn't in the prompt.

## Fix
- Zod / Joi / Yup on every API route
- Discriminated unions for multi-action endpoints
- Validate at the edge, narrow types throughout
- Generic error responses; log details server-side
