# Crypto Project Blueprint

This is defensive engineering guidance, not trading or financial advice. It deliberately contains no wallets, strategies, targets, transaction logic, or market-monitoring data from another system.

## Separate the planes

```text
research/read plane
  RPC reads, indexers, explorers, simulations

decision plane
  normalized facts, risk checks, human approval

execution plane
  signer, nonce manager, policy enforcement, broadcast

audit plane
  immutable intent, hashes, receipts, reconciliation
```

The read plane must not quietly gain signing authority. The model may help analyze or draft an intent, but deterministic policy and an authorized human control value transfer.

## Key and wallet model

- Use separate wallets and credentials for development, testnet, staging, treasury, and production automation.
- Prefer hardware-backed or managed signing for material funds.
- Keep seed phrases and private keys out of chat, repositories, logs, screenshots, and general-purpose agent environments.
- Give an automation wallet only the assets, contracts, chains, methods, and spend limits it needs.
- Rotate or revoke access at the end of an experiment.
- Treat approvals/allowances as spend authority; monitor and revoke them deliberately.

## Transaction gate

Freeze an intent before signing:

```text
chain ID
from
to
method selector / operation
decoded arguments
value
token and amount
maximum fee
nonce policy
deadline
expected state changes
simulation block/hash
intent hash
```

Then require:

1. Current chain and contract identity verification.
2. Simulation against the intended state.
3. Allowlist and limit checks in deterministic code.
4. Exact approval for the immutable intent when value or permissions change.
5. One broadcast attempt unless state proves retry is safe.
6. Receipt, event, balance, allowance, and accounting reconciliation.

Never sign opaque calldata merely because a UI or model labels it safe.

## Smart-contract workflow

- Write invariants before implementation.
- Use unit, fuzz, invariant, and fork tests where appropriate.
- Test access control, upgrade paths, pause/emergency behavior, rounding, reentrancy, oracle failure, stale prices, token quirks, and partial execution.
- Pin compiler and dependency versions.
- Verify deployed bytecode and constructor/initializer state.
- Use an independent review and a public disclosure policy before holding user funds.
- Do not treat an audit as a guarantee.

## Off-chain services

- Assume RPC/indexer data can be stale, reorganized, incomplete, or malicious.
- Record block number and block hash with every decision.
- Reconcile indexed state with direct chain reads for critical operations.
- Use idempotency keys and explicit reorg/finality policies.
- Separate price discovery from execution and set bounded slippage/expiry rules.
- Monitor signer health, nonce gaps, stuck transactions, balance floors, allowance changes, and contract upgrades.

## Agent boundary

Agents can help with read-only research, code generation, test creation, simulation analysis, and immutable transaction drafts. They do not receive standing permission to sign, broadcast, bridge, trade, deploy, change ownership, or move funds unless an explicit narrowly scoped policy grants that authority.

## Pre-production evidence

- Threat model and trust assumptions reviewed.
- No real keys or funds in development fixtures.
- Tests cover negative and adversarial paths.
- Simulations are reproducible at recorded blocks.
- Limits fail closed.
- Emergency stop and recovery are tested.
- Monitoring and on-call ownership are defined.
- Transaction manifests and receipts reconcile.
- Legal, tax, sanctions, consumer, and licensing questions are reviewed for the actual jurisdiction and product.
