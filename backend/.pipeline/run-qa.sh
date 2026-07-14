#!/usr/bin/env bash
# SplitPay pipeline — Phase 5 (QA). Run only AFTER the Developer finishes.
# Dispatches the sp-qa subagent (model/effort from .claude/agents/sp-qa.md). Reports only; never edits source.
set -euo pipefail
cd "/Users/Kai_1/Documents/development/hackathon/SplitPay"
exec claude "Use the sp-qa subagent (.claude/agents/sp-qa.md) to verify the SplitPay backend against backend/ARCHITECTURE.md (v2 final). Write unit tests (splits, balances, simplifyDebts, and the required expense->debt->settle-full->pair==0 netting test) and integration tests for every endpoint; mock all Stellar calls (insufficient balance, bad sequence, 504 timeout, malformed destination, duplicate settlement); cover invalid payloads, missing auth, boundaries. Produce backend/TEST_REPORT.md with a per-endpoint pass/fail matrix + severities. Never modify source code; file failures for the Developer to fix."
