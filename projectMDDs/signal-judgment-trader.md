# Project Brief: Signal + Judgment Trader

| Field | Value |
|---|---|
| **id** | `signal-judgment-trader` |
| **title** | Signal + Judgment Trader |
| **subtitle** | An algorithmic trading system whose key finding is an honest negative result |
| **completedAt** | 2026-06-11 |
| **featured** | `true` |

## Description

An algorithmic trading system for liquid US equities built as a three-layer decision
pipeline — ML signal model, LLM judgment filter, hard-coded risk gate — with an
event-driven backtester as the "truth machine" built first. The headline result is
the one most trading projects hide:

| Metric | Gate | In-sample (lookahead — invalid) | **Walk-forward out-of-sample** |
|---|---|---|---|
| Sharpe | ≥ 1.0 | 1.18 | **−0.02** |
| Max drawdown | ≤ 15% | 3.1% | **16.0%** |
| Profit factor | ≥ 1.3 | 1.70 | **0.99** |
| Net return | — | +14.6% | **−1.2%** |

The same model that looks excellent scored over its own training window has **no
out-of-sample edge whatsoever**. The score→return decile curve is flat-to-inverted
(top-minus-bottom spread −0.03%), mean OOS AUC is 0.516 across 12 walk-forward folds
with 3 folds below 0.5, and losses concentrate entirely in the 2022 bear market — the
classic failure mode of long-only mean-reversion, buying dips that keep dipping.

That gap *is* the finding. The system was designed so that this outcome would be
detected rather than shipped: a pre-registered backtest gate (Sharpe ≥ 1.0, max DD
≤ 15%, PF ≥ 1.3 after costs), walk-forward validation with an embargo, mutation-tested
anti-lookahead guarantees, and an explicit "honest checkpoint" stating that if OOS
results fail the gate, the correct outcome is to stop — not to loosen the gate or
tweak the backtester. When the checkpoint fired, the gate was not loosened, the cost
model was not softened, and the thesis was rejected on the evidence. The design doc
listed "no real edge exists" as the most likely risk from day one; the system's
willingness to stop is a feature, not a failure.

The engineering around that result is fully built and tested: a Pydantic-schema'd
pipeline (signal → judgment → risk → execution) where each stage can only shrink or
block what the previous stage proposes, a fail-closed Claude API judgment agent, an
immutable risk layer with mandatory stops and a kill switch, deterministic
reproducible backtests keyed by config hash, and paper-trading execution via Alpaca.

## Technical Challenges

### 1. Walk-forward validation that can't lie to you

The in-sample row of the results table shows the trap: naive evaluation produces
Sharpe 1.18 from pure lookahead. The system avoids it with a rolling walk-forward
scheme — 4-year train windows, 6-month validation windows tiling history without
overlap, and a 5-trading-day embargo gap between train and validation equal to the
label horizon, so no 5-day forward-return label ever leaks across the boundary. At
backtest time, each trading day is scored only by the fold model whose validation
window contains that day, so no prediction ever comes from a model that trained on
the row's own date.

### 2. An LLM as a fail-closed trade filter, not a trader

The judgment layer sends each signal plus context (earnings calendar, macro events,
news) to a Claude API agent that returns APPROVE / REJECT / REDUCE_SIZE with
reasoning. The contract is asymmetric by construction: Claude can only remove or
shrink trades, never create, enlarge, or redirect them — and that's enforced in code
(Pydantic validators clamping size multipliers to decisions, a parser that accepts
only the three decision values), not just in the prompt. Any failure — API timeout,
unparseable JSON, schema violation — resolves to REJECT: an unreachable judge means
no trade, never a default approve.

### 3. Proving the absence of lookahead, not just claiming it

Anti-lookahead is enforced by a poisoned-future mutation test: unit fixtures corrupt
all bars *after* date D and assert that D's computed features are bit-identical, so
any accidental use of future data fails the suite immediately. Entry fills are
modeled at the next day's open (matching the live fill convention), never the signal
day's close, and every backtest result carries a config hash — a run that can't be
reproduced exactly doesn't count.

### 4. A checkpoint mechanism designed to kill the project

The design doc pre-registered the success gate and an "honest checkpoint": if
out-of-sample results don't approach the gate after reasonable iteration, stop —
don't loosen the gate, don't modify the backtester, don't re-tune on the same OOS
window. Diagnostics (decile calibration, score distribution, per-year PnL
attribution) showed the failure was structural — no score→return relationship at
all — so further feature tweaking would only have manufactured overfitting. The
checkpoint fired as designed, and the negative result was written up with full
reproduction steps instead of being buried.

## Tech Stack

```json
["Python", "LightGBM", "Anthropic Claude API", "Alpaca", "Pydantic", "DuckDB", "pytest"]
```

## Links

| Link | URL |
|---|---|
| `repository` | https://github.com/GoncaloCalvo/signal-judgment-trader *(placeholder — confirm actual repo URL before populating projects.json)* |
| `caseStudyUrl` | *(optional — could link the negative-result writeup if published)* |
