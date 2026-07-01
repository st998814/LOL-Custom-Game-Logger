---
name: implement-feature
description: Turns user stories and feature requests into clear, executable implementation plans before coding begins. Use when implementing a user story, starting a feature, picking up a backlog item, working on P0/P1/P2 tasks, turning requirements into implementation, or preparing a feature for coding.
---

# Implement Feature Skill

## Purpose

Turn a user story or feature request into a clear, executable implementation plan.

This skill should be used **before coding begins**.

The goal is not to immediately write code. The goal is to understand the task, identify affected areas, define the implementation path, and prepare for reliable execution.

---

## When to Use

Use this skill when the user asks to:

- Implement a user story
- Start a feature
- Pick up a backlog item
- Work on a P0/P1/P2 task
- Turn requirements into implementation
- Prepare a feature for coding

---

## Required Inputs

Before starting, collect or infer:

- User story ID
- Priority: P0 / P1 / P2
- User story description
- Acceptance criteria
- Related PRD section
- Related architecture document
- Existing code area
- Target platform or module
- Known constraints

If any required information is missing, make a reasonable assumption and state it clearly. Do not block progress unless the missing information makes implementation unsafe or impossible.

---

## Workflow

### 1. Understand the User Story

Restate the user story in engineering terms. Identify:

- User goal
- Business value
- Expected behavior
- Non-goals
- Edge cases
- Ambiguity
- Dependency on other stories

**Output:**

```md
## Story Understanding

- User story:
- Priority:
- Goal:
- Expected behavior:
- Non-goals:
- Assumptions:
- Open questions:
```

---

### 2. Check Product and Architecture Context

Review relevant project documents before coding:

- PRD
- System architecture
- API contract
- Database schema
- Existing user stories
- ADRs
- Coding conventions
- Project rules

Identify whether the feature conflicts with existing decisions.

**Output:**

```md
## Context Review

- PRD references:
- Architecture references:
- Existing related code:
- Relevant ADRs:
- Constraints:
- Potential conflicts:
```

---

### 3. Identify Affected Modules

List all parts of the system likely to change. Examples:

- Frontend pages
- Components
- API routes
- Services
- Repositories
- Database schema
- Authentication
- Authorization
- Background jobs
- External services
- Tests
- Documentation

**Output:**

```md
## Affected Modules

| Area     | Expected Change | Risk               |
|----------|-----------------|--------------------|
| Frontend |                 | Low / Medium / High |
| Backend  |                 | Low / Medium / High |
| Database |                 | Low / Medium / High |
| Tests    |                 | Low / Medium / High |
| Docs     |                 | Low / Medium / High |
```

---

### 4. Inspect Existing Implementation

Before creating new code, check whether similar logic already exists. Look for:

- Reusable services
- Reusable components
- Existing API patterns
- Similar tests
- Duplicated domain logic
- Existing utilities
- Naming conventions

Do not introduce a new pattern if an existing project pattern already solves the problem.

**Output:**

```md
## Existing Implementation Review

- Similar files:
- Reusable logic:
- Existing patterns:
- Possible duplication risk:
- Recommended reuse:
```

---

### 5. Produce Implementation Plan

Create a step-by-step implementation plan. The plan should be small enough to execute safely.

**Output:**

```md
## Implementation Plan

1. 
2. 
3. 
4. 
5. 
```

Each step should describe:

- What will change
- Where it will change
- Why it is needed
- Expected result

---

### 6. Decompose into Tasks

Break the feature into concrete coding tasks. Each task should be independently understandable.

**Output:**

```md
## Task Breakdown

### Task 1 — 

- Scope:
- Files likely affected:
- Dependencies:
- Expected result:

### Task 2 — 

- Scope:
- Files likely affected:
- Dependencies:
- Expected result:
```

---

### 7. Define TOD Test Matrix

Before implementation, create a Test-Oriented Development matrix. Do not write test code yet — define what must be verified.

**Output:**

```md
## Test Matrix

| Scenario      | Test Type                              | Expected Result | Priority |
|---------------|----------------------------------------|-----------------|----------|
| Happy path    | Unit / Integration / E2E / Manual      |                 | P0       |
| Invalid input | Unit / Integration / E2E / Manual      |                 | P0       |
| Edge case     | Unit / Integration / E2E / Manual      |                 | P1       |
| Regression    | Unit / Integration / E2E / Manual      |                 | P1       |
```

**Test types:**

- Unit
- Integration
- E2E
- Manual smoke test
- Regression

---

### 8. Define Definition of Done

Create a feature-specific completion checklist.

**Output:**

```md
## Definition of Done

- [ ] Acceptance criteria satisfied
- [ ] Implementation follows architecture
- [ ] Existing conventions followed
- [ ] Test matrix covered
- [ ] Unit tests added or updated
- [ ] Integration tests added or updated if needed
- [ ] E2E/manual smoke test completed if needed
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Build passes
- [ ] No unrelated changes
- [ ] Documentation updated
- [ ] PR summary prepared

After verification passes, use **publish-pull-request** to open the PR.
```

---

### 9. Risk Review

Identify risks before implementation.

**Output:**

```md
## Risk Review

| Risk | Impact              | Mitigation |
|------|---------------------|------------|
|      | Low / Medium / High |            |
```

**Common risks:**

- Unclear requirement
- Architecture violation
- Data migration risk
- Auth/security risk
- Breaking existing behavior
- Poor test coverage
- Hidden dependency
- UI state complexity

---

### 10. Implementation Readiness

End by stating whether the feature is ready for coding.

**Output:**

```md
## Implementation Readiness

Status: Ready / Not Ready

Reason:

Next recommended action:
```

Only proceed to coding if the status is `Ready`.

---

## Rules

- Do not start coding before producing the implementation plan.
- Do not skip the Test Matrix.
- Do not invent architecture that conflicts with existing project documents.
- Prefer reusing existing patterns over introducing new abstractions.
- Keep tasks small and reviewable.
- State assumptions clearly.
- Escalate only blocking ambiguity.
- Avoid unrelated refactoring.
- Avoid broad rewrites unless explicitly requested.

---

## Expected Final Output

When this skill is used, produce:

1. Story Understanding
2. Context Review
3. Affected Modules
4. Existing Implementation Review
5. Implementation Plan
6. Task Breakdown
7. Test Matrix
8. Definition of Done
9. Risk Review
10. Implementation Readiness

## Additional resources

For this repository's document map, see [reference.md](reference.md).
