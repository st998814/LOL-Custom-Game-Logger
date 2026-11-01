
Sequential Plan Execution
=========================

Purpose
-------

This skill defines how the coding agent must execute an approved implementation plan.

The primary principle is **one To-do = one implementation unit = one proposed commit**.

Do not implement all To-dos in a single batch and propose one combined commit at the end.

When to apply
-------------

Apply this skill whenever the agent executes a plan containing multiple To-dos, implementation steps, or tasks.

This applies to plans created by the agent or provided by the user.

Execution workflow
------------------

### 1\. Read the plan

Before implementation:

-   Read the complete approved plan.

-   Identify all To-dos and their execution order.

-   Understand dependencies between To-dos.

-   Identify any shared files or components that may be affected.

-   Preserve the existing plan scope unless changes are necessary.

Do not begin implementing multiple To-dos simultaneously.

### 2\. Execute one To-do

For each To-do, in order:

1.  Select the next pending To-do.

2.  Implement only the changes required for that To-do.

3.  Avoid unrelated changes or premature implementation of later To-dos.

4.  Run relevant validation, such as tests, type checks, or linting.

5.  Fix issues introduced by the current implementation.

6.  Mark the To-do as completed only when its acceptance criteria are satisfied.

If the To-do cannot be completed, report the blocker and do not mark it as completed.

### 3\. Prepare the commit message

Immediately after completing a To-do:

-   Summarize what was implemented.

-   Identify the files or components affected.

-   Report validation results.

-   Provide a proposed Conventional Commit message.

-   Clearly separate the current To-do from the next one.

**Never execute** `**git commit**` **or create a commit on behalf of the user.**

### 4\. Stop at the commit boundary

After each completed To-do:

-   Present the proposed commit message to the user.

-   Stop implementation before starting the next To-do.

-   Allow the user to inspect and commit the changes manually.

-   Continue to the next To-do only after the user explicitly requests continuation.

Do not automatically proceed through the remaining To-dos.

### 5\. Repeat

Repeat steps 2--4 until every To-do has been completed.

Each completed To-do must have its own implementation, validation, and proposed commit message.

Commit message format --- Conventional Commits
--------------------------------------------

```
<type>(<scope>): <subject>

<optional body --- what & why, wrapped ~72 cols>

<co-author trailer>
```

### Rules

**Type**

Allowed types:

-   `feat`

-   `fix`

-   `docs`

-   `refactor`

-   `chore`

-   `test`

-   `perf`

-   `style`

-   `build`

-   `ci`

Align with the branch's `branch_type` when appropriate.

**Scope**

Optional. Prefer a concise name representing the affected subsystem, such as `auth`, `stats`, `bot`, `frontend`, `poster`, or `agent-files`.

**Subject**

-   Use imperative mood.

-   Use lowercase.

-   Do not end with a period.

-   Describe the actual change rather than the To-do number.

**Body**

-   Explain what changed and why.

-   Include the body when it adds useful context.

-   Wrap lines at approximately 72 characters.

**Co-author trailer**

Attribute the agent that actually performed the work only when its standard name and email identity are known.

Never guess or invent an email address, or attribute the work to a different provider.

Omit the trailer when the executing agent cannot accurately identify itself.

Git safety rules
----------------

The following rules are mandatory:

1.  **Never run** `**git commit**`**.**

2.  Never run `git commit --amend`.

3.  Never run `git push`.

4.  Never create commits using Git APIs or other tools.

5.  Never stage changes automatically using `git add`, unless the user explicitly requests staging.

6.  Never discard or overwrite unrelated user changes.

7.  Do not combine several completed To-dos into one proposed commit.

8.  Do not claim a commit exists when only a message has been proposed.

The user retains full responsibility for reviewing, staging, and committing changes.

Completion report format
------------------------

After each To-do, use this structure:

### To-do [N]: [Title]

**Status:** Completed / Blocked

**Implementation**

-   Brief description of changes.

**Validation**

-   Tests and checks performed.

-   Results and any remaining issues.

**Proposed commit message**

```
feat(stats): implement average statistics service

add average calculation and response types for player stats

cover rounding and empty-result behaviour with unit tests
```

**Next To-do:** [N+1] --- [Title]

**Execution state:** Paused for user review and manual commit.

Handling exceptions
-------------------

### Dependencies between To-dos

If the current To-do depends on work scheduled for a later To-do, report the dependency instead of silently implementing both.

Recommend a plan adjustment when necessary.

### Multiple concerns within one To-do

A single To-do may affect multiple files or layers.

Keep the changes together when they form one coherent implementation unit.

Do not split a To-do arbitrarily into separate commits unless the user requests it.

### Validation failures

If validation fails:

-   Investigate whether the failure was introduced by the current changes.

-   Fix failures caused by the current To-do.

-   Report unrelated or pre-existing failures.

-   Do not describe a To-do as successfully validated if required checks remain failing.

### Existing uncommitted changes

Before starting a To-do, inspect the working tree.

If unrelated uncommitted changes exist, preserve them and report any risk of overlap.

Never assume that existing modifications belong to the current To-do.

Non-negotiable rules
--------------------

-   Execute To-dos sequentially.

-   Complete and validate one To-do before starting another.

-   Provide exactly one proposed commit message per completed To-do by default.

-   Pause between To-dos for user review.

-   Never commit automatically.

-   Never batch all To-dos into one final commit.

-   Never mark incomplete work as completed.

**The coding agent implements and validates. The user reviews and commits.**