---
tags: [security, vibecoding, injection, owasp-a03]
date: 2026-04-28
parent: [[Vibecoding Security Research - Index]]
last-updated: 2026-04-29
part-of: '[[Vibecoding - Things to Check on Your Code]]'
---

# Backend Code Execution Bugs

## What it looks like
- Command injection: `exec(\`convert ${userInput} out.png\`)`
- Unsafe deserialization: `eval(json)`, `Function(code)`
- Path traversal in upload handlers: `fs.writeFile('uploads/' + filename)` accepts `../../etc/passwd`
- SSRF: `fetch(req.body.imageUrl)` accepts `http://169.254.169.254/latest/meta-data`
- Prototype pollution via `Object.assign(target, JSON.parse(input))`

## GitHub Copilot study
~40% of generated programs vulnerable across CWE Top 25. Command injection and path traversal among most common.

## Fix
- Spawn-with-args, never shell-with-string
- Allowlist file extensions, sanitize filenames, sandbox upload paths
- SSRF guards: deny private IP ranges, AWS metadata IPs, file:// scheme
- `Object.create(null)` or schema validation for incoming JSON
