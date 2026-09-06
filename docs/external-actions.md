# External Actions

An agent can research and draft broadly. Sending, deploying, inviting, paying, signing, trading, or changing account state needs a narrower contract.

## Immutable action manifest

Before a consequential external action, freeze:

- exact target/recipient and verified identity;
- channel/provider and environment;
- subject, body, payload, or artifact hash;
- reply/thread/deployment context;
- attachments and their hashes;
- permissions, amount, limits, or other material parameters;
- authorization source and scope;
- expected receipt/post-state;
- retry and rollback policy.

Any material edit creates a new draft and may require new approval.

## Dispatch rules

- Check duplicates across available history and active outboxes.
- Use one exact target per action.
- Dispatch sequentially when ambiguity or rate limits matter.
- Provider acceptance is not the same as final delivery; record the strongest evidence actually available.
- An ambiguous submit becomes `unknown` and is never retried automatically.
- Reconcile the manifest with the provider receipt and observed state.
- Never infer standing authorization from a previous recipient, draft, environment, or action type.

## Delegated automation

If a workflow receives standing authority, encode its boundaries explicitly:

- allowed objective and duration;
- allowed recipients/resources/channels;
- allowed factual content and mutations;
- excluded negotiation, commitments, payments, deletion, or production control;
- rate and spend limits;
- immutable audit trail;
- receipt requirement;
- fail-closed conditions that return the action for human approval.
