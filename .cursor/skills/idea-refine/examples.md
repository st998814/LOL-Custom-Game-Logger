# Ideation Session Examples

Illustrative patterns — adapt to the user's idea and context.

---

## Example 1: Vague Feature Request

**User input:** "I want to add notifications when someone wins a duel."

### Phase 1 — Restate & Sharpen

**HMW:** How might we keep duel group members informed of new results without adding noise?

**Sharpening questions (via AskQuestion):**
- Who gets notified — everyone in the group, or only the loser?
- What does success look like — faster banter, or fewer "wait who won?" messages?
- Constraint: Telegram-only for MVP, or open to push/email later?

**Variations (excerpt):**
1. **Instant win ping** — Bot posts to group chat the moment a duel ends. Simple, but could spam active nights.
2. **Digest mode** — Daily summary of duels. Quiet, but misses the live rivalry energy.
3. **Opt-in rivalry alerts** — Only notify when *your* head-to-head record changes. Personal, not noisy.
4. **Inversion: silence by default** — No notifications; users pull history on demand. Tests whether anyone actually wants push.
5. **Simplification: reaction-only** — Post result to chat; users react with emoji. Zero new infra, validates engagement.

### Phase 2 — Converge

**Clustered directions:**
- **A: Live group feed** (instant post to Telegram)
- **B: Personal rivalry tracker** (notify on your matchups only)
- **C: Pull-only** (no notifications; improve history UX instead)

**Stress-test (Direction A):**
- User value: High for active groups — painkiller for "who won?"
- Feasibility: High — webhook on match persist
- Differentiation: Low — any bot can post messages
- **Assumption to validate:** Group chat is the right surface (not DMs)
- **Kill criterion:** Users mute the chat within a week

### Phase 3 — One-pager (excerpt)

```markdown
## Not Doing (and Why)
- Push notifications outside Telegram — MVP is Telegram-native; email adds auth and deliverability work
- Custom notification preferences — validate demand with on/off at group level first
- Real-time in-game alerts — LCU capture happens post-game; don't fake live updates
```

---

## Example 2: Scope Creep

**User input:** "Let's also track champion win rates, item builds, and lane matchups."

### Pushback (honest convergent mode)

"That's three products wearing a trench coat. Your PRD says the core job is **trustworthy duel logging** — champion analytics is a different user (theorycrafters), different data (full match detail), different UX."

**Sharper HMW:** How might we surface *just enough* context to settle disputes without becoming op.gg?

**Recommended direction:** Log winner + champion names only in MVP. Defer win rates until 50+ matches exist.

---

## Example 3: Codebase-Grounded Ideation

**User input:** "Should we add a web dashboard?"

**Agent scans architecture** (`docs/01-architecture/SystemArchitecture.md`):
- MVP path is Telegram bot + local client + server API
- No frontend stack in repo yet

**Variations grounded in reality:**
1. **Telegram inline keyboards** — Rich menus in existing channel; zero new deploy surface
2. **Static stats page** — Single HTML generated server-side; no SPA
3. **Full React dashboard** — Highest polish, highest cost; delays core logging
4. **Obsidian/export** — Markdown export for power users who already use notes

**Converge:** Direction 1 first (leverage Telegram), Direction 2 only if inline limits hit.

---

## Tone Reference

**Too supportive (avoid):**
> "Great idea! A dashboard would be amazing for users!"

**Sharp partner (target):**
> "A dashboard solves a problem you don't have yet — nobody's logged a single match. What if the bot's `/record` output *is* the dashboard for now?"
