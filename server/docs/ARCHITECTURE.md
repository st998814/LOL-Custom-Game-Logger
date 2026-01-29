# LOL Custom Game Logger – Architecture

## Server Overview
The backend is an Express application written in TypeScript (see `server/src`). Runtime bootstrapping lives in `src/index.ts`, while the HTTP surface is defined in layered modules under `src/routes`, `src/controllers`, `src/services`, and `src/models`. Data persistence uses Prisma (`server/prisma`) with the generated client emitted into `server/generated/prisma` and consumed via the shared helper `src/db/prisma.ts`.

The repository README captures the detailed boundaries and responsibilities of each layer. This document supplements it with system-level context, wiring, and operational guidance.

## Layered Responsibilities
- **Routes**: Define HTTP endpoints and middleware composition. Each file wires URL patterns to controller entry points only—no business logic or persistence calls.
- **Controllers**: Translate HTTP concerns into service calls. Controllers handle validation, serialization, status codes, and error mapping, but they never talk to Prisma directly.
- **Services**: Encapsulate domain/business rules. Services orchestrate multiple models, enforce invariants, and expose reusable operations to controllers. They depend solely on models (or other services).
- **Models**: Provide the data-access layer. Model modules wrap Prisma queries, mutations, and transactions. They expose typed functions that hide schema details from the rest of the stack.

These boundaries ensure $routes \rightarrow controllers \rightarrow services \rightarrow models$ remains a one-way flow, preventing circular dependencies and keeping business logic framework-agnostic.

### Example Flow

**Route** ([server/src/routes/match.routes.ts](server/src/routes/match.routes.ts))

```ts
import { Router } from 'express';
import { createMatchController } from '../controllers/match.controller.js';

const router = Router();

router.post('/matches', createMatchController);

export default router;
```

**Controller** ([server/src/controllers/match.controller.ts](server/src/controllers/match.controller.ts))

```ts
import type { Request, Response } from 'express';
import { createMatchService } from '../services/match.service.js';

export async function createMatchController(req: Request, res: Response) {
	const payload = req.body; // assume prior validation middleware
	const match = await createMatchService(payload);
	res.status(201).json(match);
}
```

**Service** ([server/src/services/match.service.ts](server/src/services/match.service.ts))

```ts
import { createMatchRecord } from '../models/match.model.js';

export async function createMatchService(payload: MatchInput) {
	// Domain guard rails, e.g., deduplicate on `gameId`
	return createMatchRecord(payload);
}
```

**Model** ([server/src/models/match.model.ts](server/src/models/match.model.ts))

```ts
import prisma from '../db/prisma.js';

export async function createMatchRecord(data: MatchInput) {
	return prisma.match.create({ data });
}
```

## Request Lifecycle
1. **Routing**: Express matches the incoming path/method in `src/routes`, invoking the mapped controller.
2. **Controller Adaptation**: Controller validates request data, pulls auth/session context if needed, and calls the appropriate service method.
3. **Service Logic**: The service enforces domain rules—e.g., deduplicating match logs, coordinating multiple model calls, or handling retries.
4. **Model Persistence**: Models execute Prisma queries through the shared `prisma` instance (`src/db/prisma.ts`). They return typed DTOs to services.
5. **Response**: Controllers translate service results into HTTP responses (JSON payloads, status codes) and send them back via Express.

## Prisma & Database
- Schema definitions live in `server/prisma/schema.prisma`, with migrations under `server/prisma/migrations`.
- Run `npx prisma generate` after schema changes to refresh `server/generated/prisma`.
- The shared Prisma client uses the Postgres driver adapter (`@prisma/adapter-pg`) and reads the connection string from `process.env.DATABASE_URL`.

## TypeScript Configuration
- `tsconfig.json` sets `rootDir` to the server folder and includes both `src` (hand-written code) and `generated` (Prisma output), ensuring `tsc` can analyze imports such as `../../generated/prisma/client.js`.
- Compilation targets modern Node (`module: nodenext`, `target: esnext`) so ESM imports remain native.

## Operational Notes
- Use `npm run dev` for live reload (`tsx watch ./src/index.ts`).
- Keep each layer’s folders flat; add subfolders only when a domain warrants grouping (e.g., `services/match/`).
- When introducing new endpoints, update layers in order: **model → service → controller → route**. This keeps lower layers testable before wiring HTTP concerns.
- Document any cross-cutting policies (auth, rate limiting, telemetry) in this `docs/` directory and summarize them in the README so contributors understand the expected flow quickly.
