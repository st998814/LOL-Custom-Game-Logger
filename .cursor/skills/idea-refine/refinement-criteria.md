# Refinement Criteria

Use this rubric during Phase 2 to stress-test directions honestly.

## Core Criteria

### User Value

| Signal | Strong | Weak |
|--------|--------|------|
| Pain frequency | Happens every session / daily | Rare edge case |
| Pain intensity | Clear frustration, workaround exists but hated | Mild inconvenience |
| Willingness to switch | Users actively seeking alternatives | "Nice to have" |
| Type | Painkiller (must solve) | Vitamin (nice if free) |

**Questions:**
- Who specifically benefits, and can you name a real person?
- What do they do today without this? How painful is that workaround?
- Would they notice if this disappeared after a week?

### Feasibility

| Signal | Strong | Weak |
|--------|--------|------|
| Technical risk | Known patterns, existing building blocks | Novel research required |
| Time to MVP | Days to a few weeks | Months before learning anything |
| Dependencies | Self-contained or already owned | Blocked on third parties |
| Maintenance | Low ongoing cost | High operational burden |

**Questions:**
- What's the hardest technical piece? Have you done anything like it before?
- What's the smallest experiment that proves feasibility?
- What breaks if Riot, Telegram, or another dependency changes?

### Differentiation

| Signal | Strong | Weak |
|--------|--------|------|
| Unique angle | Clear "only we do X" story | Feature parity with incumbents |
| Switching cost | Worth the migration | "Why not just use a spreadsheet?" |
| Defensibility | Gets better with use (data, network) | Easily copied in a weekend |

**Questions:**
- Why wouldn't someone keep using their current solution?
- What would a skeptical friend push back on?
- Is the differentiation durable or cosmetic?

## Assumption Categories

For each direction, name assumptions in these buckets:

| Category | Example | Validation approach |
|----------|---------|---------------------|
| User | "Duel groups want shared history" | Interview 3 groups; check if they log today |
| Technical | "LCU exposes enough data at game end" | Spike: capture one real game |
| Business | "Friends will trust automated logging" | Prototype + observe disputes |
| Market | "No existing tool serves this niche" | Competitive scan + Reddit/Discord search |
| Behavioral | "Players won't forget to run the client" | Usage telemetry in beta |

## Kill Criteria

Name what would make you abandon this direction:

- **Hard kill:** Evidence that disproves a core assumption
- **Soft kill:** Cost exceeds value at current scale
- **Pivot trigger:** A better adjacent problem emerges from validation

## Scoring (Optional)

When comparing 2-3 directions, rate each 1-5 on User Value, Feasibility, and Differentiation. Use scores to structure the conversation — not as a substitute for judgment.

```
Direction A: Value 4 / Feasibility 5 / Differentiation 3 → Ship fast, watch differentiation
Direction B: Value 5 / Feasibility 2 / Differentiation 5 → High upside, validate feasibility first
```

Pick the direction that best balances **learning speed** with **upside**, not just the highest total score.

## Red Flags in Evaluation

- All three directions score high on everything (you're not being honest)
- Differentiation relies on "we'll execute better" without a structural advantage
- MVP scope keeps growing to "make it useful" instead of "test one assumption"
- No direction has a clear kill criterion
