# Credential Request Template

Copy `credential-request.example.json`, replace every bracketed placeholder with verified non-secret facts, give the file a project-specific name, and review it before running:

```bash
secenv ask --schema path/to/reviewed-request.json
```

The schema must pass `secenv` validation: exact field label/help, HTTPS provider page without query/fragment, one owner-only absolute/`~` output per field, and mode `0600`.

Never place a credential value in this schema. If a token/key accidentally appears in title, description, label, help, URL, or another public metadata field, treat it as exposed and rotate it.
