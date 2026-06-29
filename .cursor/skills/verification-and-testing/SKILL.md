---
name: verification-and-testing
description: Verifies implemented features and code changes are correct, tested, maintainable, and ready for review using Test-Oriented Development. Use when implementation is complete, a feature needs verification, tests need writing, a bug fix needs regression testing, a pull request needs pre-review, the user asks whether a task is done, or the user asks to validate agent-generated code.
---

# Verification and Testing Skill

## Purpose

Verify that an implemented feature or code change is correct, tested, maintainable, and ready for review.

This skill follows **Test-Oriented Development**.

The goal is not only to write tests, but to prove that the task satisfies the acceptance criteria and Definition of Done.

---

## When to Use

Use this skill when:

- Implementation is completed
- A feature needs verification
- Tests need to be written
- A bug fix needs regression testing
- A pull request needs pre-review
- The user asks whether a task is done
- The user asks to validate agent-generated code

---

## Required Inputs

Collect or infer:

- User story ID or issue ID
- Acceptance criteria
- Implementation summary
- Files changed
- Existing test setup
- Test Matrix from the planning phase
- Definition of Done
- Commands for lint, typecheck, test, and build

If the original Test Matrix does not exist, create one before writing tests.

---

## Workflow

### 1. Review Acceptance Criteria

Start by restating what must be true for the task to be correct.

**Output:**

```md
## Acceptance Criteria Review

- [ ] 
- [ ] 
- [ ] 
```

If any acceptance criterion is unclear, state the assumption and continue.

---

### 2. Review Changed Files

Inspect the implementation. Identify:

- Files changed
- New behavior
- Modified behavior
- Removed behavior
- Possible side effects
- Architectural concerns

**Output:**

```md
## Changed Files Review

| File | Change Summary | Concern                    |
|------|----------------|----------------------------|
|      |                | None / Low / Medium / High |
```

---

### 3. Rebuild or Create Test Matrix

Use the planning-phase Test Matrix if available. If missing, create one now.

**Output:**

```md
## Test Matrix

| Scenario      | Test Type                         | Expected Result | Covered    |
|---------------|-----------------------------------|-----------------|------------|
| Happy path    | Unit / Integration / E2E / Manual |                 | Yes / No   |
| Invalid input | Unit / Integration / E2E / Manual |                 | Yes / No   |
| Edge case     | Unit / Integration / E2E / Manual |                 | Yes / No   |
| Regression    | Unit / Integration / E2E / Manual |                 | Yes / No   |
```

---

### 4. Decide Which Tests to Write

Do not write meaningless tests just to increase coverage.

**Prioritize:**

1. Business-critical behavior
2. Edge cases
3. Regression risks
4. Error handling
5. Security-sensitive behavior
6. Integration boundaries

**Output:**

```md
## Test Plan

### Unit Tests
- 

### Integration Tests
- 

### E2E Tests
- 

### Manual Smoke Tests
- 
```

---

### 5. Write or Update Tests

Add tests that directly map to the Test Matrix.

**Rules:**

- Each important acceptance criterion should have at least one verification path.
- Prefer behavior-based tests over implementation-detail tests.
- Avoid brittle tests that depend on private internals.
- Use existing test patterns and utilities.
- Do not create a new test framework unless explicitly required.
- Include regression tests for bug fixes.

**Output:**

```md
## Tests Added or Updated

| Test File | Scenario Covered |
|-----------|------------------|
|           |                  |
```

---

### 6. Run Automated Verification

Run the project's standard verification commands. Use the commands defined by the project.

**Common examples:**

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

```bash
pytest
ruff check .
mypy .
```

**Output:**

```md
## Verification Results

| Check     | Command | Result                        |
|-----------|---------|-------------------------------|
| Lint      |         | Pass / Fail / Not Available   |
| Typecheck |         | Pass / Fail / Not Available   |
| Tests     |         | Pass / Fail / Not Available   |
| Build     |         | Pass / Fail / Not Available   |
```

If a check fails, fix the issue and rerun the relevant check. Do not mark the task done while verification is failing.

---

### 7. Perform Manual Smoke Test

If the feature has UI, API behavior, auth flow, file upload, external service integration, or deployment behavior, define and perform a smoke test.

**Output:**

```md
## Manual Smoke Test

Steps:
1. 
2. 
3. 

Result: Pass / Fail / Not Performed

Notes:
```

---

### 8. Self Code Review

Review the implementation critically.

**Check:**

- Architecture respected
- No unrelated changes
- No duplicated logic
- Naming is consistent
- Error handling is explicit
- Security concerns considered
- Performance risks considered
- Database access is correctly layered
- Frontend state is not overcomplicated
- No temporary debug code remains

**Output:**

```md
## Self Review

| Area            | Result           | Notes |
|-----------------|------------------|-------|
| Architecture    | Pass / Concern   |       |
| Security        | Pass / Concern   |       |
| Error Handling  | Pass / Concern   |       |
| Maintainability | Pass / Concern   |       |
| Performance     | Pass / Concern   |       |
| Scope Control   | Pass / Concern   |       |
```

---

### 9. Check Definition of Done

Evaluate the task against the DoD.

**Output:**

```md
## Definition of Done Check

- [ ] Acceptance criteria satisfied
- [ ] Test Matrix covered
- [ ] Tests added or updated
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Tests pass
- [ ] Build passes
- [ ] Manual smoke test completed if needed
- [ ] No unrelated changes
- [ ] Documentation updated
- [ ] PR summary prepared
```

If any required item is unchecked, the task is not done.

---

### 10. Prepare Documentation Notes

Generate documentation updates after verification. Do not create unnecessary documentation — update only what changed.

**Possible docs:**

- Changelog
- API documentation
- README
- Setup guide
- Troubleshooting guide
- ADR
- Known limitations
- Developer notes

**Output:**

```md
## Documentation Notes

### Changelog Entry
- 

### API Docs Update
- Required / Not Required

### ADR
- Required / Not Required

### Developer Notes
- 
```

---

### 11. Prepare PR Summary

Create a concise PR summary.

**Output:**

```md
## PR Summary

### What changed
- 

### Why
- 

### Tests
- 

### Risks
- 

### Notes for reviewer
- 
```

---

### 12. Final Completion Decision

End with a clear decision.

**Output:**

```md
## Completion Decision

Status: Done / Not Done

Reason:

Remaining work:
```

---

## Rules

- Do not mark the task done if tests, build, lint, or typecheck fail.
- Do not write shallow tests only for coverage.
- Do not ignore acceptance criteria.
- Do not skip regression testing for bug fixes.
- Do not create unrelated refactors.
- Do not update documentation before verifying the implementation.
- Prefer existing test patterns.
- Prefer behavior-based tests.
- Make failed checks visible.
- If a command cannot be run, state why and mark it as Not Available.

---

## Expected Final Output

When this skill is used, produce:

1. Acceptance Criteria Review
2. Changed Files Review
3. Test Matrix
4. Test Plan
5. Tests Added or Updated
6. Verification Results
7. Manual Smoke Test
8. Self Review
9. Definition of Done Check
10. Documentation Notes
11. PR Summary
12. Completion Decision
