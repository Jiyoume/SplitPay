---
name: Stellar Skill
description: >-
  A comprehensive Claude skill that teaches the model how to interpret and execute the STELLAR framework for product design and development.
  It provides a clear overview, step‑by‑step instructions, required inputs, and example invocations.
---

# Stellar Skill for Claude

## 🎯 Purpose
The **Stellar** skill equips Claude with a structured methodology for turning abstract ideas into concrete, market‑ready products. It guides the model through:

1. **Problem Definition** – Clarify the target user, pain point, and success metrics.
2. **Idea Generation** – Brainstorm solutions with constraints.
3. **Validation** – Design experiments, gather feedback, and iterate.
4. **Implementation Planning** – Produce a roadmap, tech stack, and MVP scope.
5. **Launch & Growth** – Define launch tactics and growth loops.

## 📦 Inputs
| Parameter | Type | Description | Required |
|-----------|------|-------------|----------|
| `problem` | string | Short description of the problem you want to solve. | Yes |
| `target_audience` | string | Who suffers from the problem? Include demographics if relevant. | Yes |
| `constraints` | string (optional) | Any technical, regulatory, or business constraints. | No |
| `budget` | number (optional) | Approximate budget for the MVP (USD). | No |
| `timeline` | string (optional) | Desired timeframe for the MVP (e.g., "3 months"). | No |

## 🛠️ Procedure
1. **Validate Input** – Ensure `problem` and `target_audience` are non‑empty.
2. **Generate Hypotheses** – Produce 3‑5 possible solution concepts, each with a one‑sentence value proposition.
3. **Select MVP** – Rank concepts by feasibility (constraints, budget, timeline) and impact. Choose the top candidate.
4. **Design Experiments** – Suggest a minimum of two cheap validation experiments (e.g., landing‑page test, user interview script).
5. **Roadmap Sketch** – Output a high‑level milestone list (Discovery, Prototype, Test, Launch).
6. **Output Format** – Return a markdown block with the sections:
   - `## Chosen Solution`
   - `## Validation Plan`
   - `## MVP Roadmap`
   - `## Success Metrics`

## 📖 Example Invocation
```json
{
  "skill": "Stellar",
  "inputs": {
    "problem": "Small businesses struggle to collect online payments efficiently.",
    "target_audience": "Independent retailers in Southeast Asia",
    "constraints": "Must support local payment gateways, low transaction fees",
    "budget": 5000,
    "timeline": "2 months"
  }
}
```

## ✅ Expected Response
```markdown
## Chosen Solution
**SplitPay** – A lightweight, plug‑and‑play payment widget that integrates with local gateways and provides instant payouts.

## Validation Plan
1. **Landing‑page A/B test** – Measure click‑through on a pre‑signup form.
2. **Phone interview script** – Validate willingness to pay and required features.

## MVP Roadmap
- **Week 1‑2**: Research local gateways & legal compliance.
- **Week 3‑4**: Build core widget (checkout UI + API wrapper).
- **Week 5**: Conduct validation experiments.
- **Week 6**: Iterate and prepare launch assets.

## Success Metrics
- 30% sign‑up conversion on landing page.
- At least 5 retailers commit to a pilot.
- Transaction success rate > 95%.
```

## 🧩 Extensibility
- Add a `risk_assessment` flag to trigger a brief SWOT analysis.
- Provide a `market_analysis` switch for a deeper competitive overview.

---
*This skill is intentionally self‑contained so Claude can read, understand, and execute it without external references.*
