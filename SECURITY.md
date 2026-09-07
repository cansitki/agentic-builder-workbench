# Security Policy

Do not open an issue containing a secret, private key, seed phrase, recovery code, customer payload, private infrastructure identifier, or vulnerability that would expose a live system.

Report sensitive findings privately to the repository owner through a previously verified channel. Do not invent a new contact route from an unverified profile or message.

For credentials needed during agent work, the only approved value-entry route is `secenv ask` through the native Can Workbench modal. Do not paste a secret into a GitHub issue, discussion, pull request, chat, terminal, or browser form.

If a credential appears in this repository:

1. Treat it as exposed.
2. Do not copy, test, or repeat it.
3. Notify the owner privately.
4. Revoke/rotate it at the provider.
5. Remove it from current content and history through a reviewed incident procedure.
6. Verify consumers use the replacement and add a prevention check.

The material in `knowledge/vibecoding-security/` is educational and time-stamped. Verify current advisories and provider behavior before relying on it for a live system.
