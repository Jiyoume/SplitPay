#!/usr/bin/env bash
# SplitPay pipeline — Phase 4 (Developer).
# Launches Claude Code in this pane and dispatches the sp-developer subagent, so the
# model/effort in .claude/agents/sp-developer.md govern the build. Testnet only; frontend untouched.
# Permissions: plain `claude` prompts per edit/bash. For hands-off, press Shift+Tab for auto-accept
# once it starts, or add your own permission flag here. (Left plain on purpose — your safety call.)
set -euo pipefail
cd "/Users/Kai_1/Documents/development/hackathon/SplitPay"
exec claude "Use the sp-developer subagent (.claude/agents/sp-developer.md) to implement the SplitPay backend. Read, in order: backend/DECISIONS.md, backend/RESEARCH.md, backend/ARCHITECTURE.md (v2 final). Then build the whole backend under backend/ following the Architect's milestones M1 through M7 in order, compiling and running at the end of every milestone and proving each with a server boot + curl (happy path plus one invalid input expecting a clean 4xx) + a tsc typecheck. Log any spec ambiguity in backend/DEVIATIONS.md and keep moving. Testnet only; no secrets in code or logs; never modify the RN frontend at ../src or ../App.tsx. Finish by writing backend/README.md and reporting which milestones are runnable."
