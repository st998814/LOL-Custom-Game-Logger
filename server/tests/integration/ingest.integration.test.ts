import 'dotenv/config';

import { afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';

import app from '../../src/app.js';
import prisma from '../../src/db/prisma.js';
import {
  loadMatchSnapshotFixture,
  withGameId,
} from '../helpers/ingestFixtures.js';

const integrationEnabled = Boolean(process.env.DATABASE_URL);

function uniqueGameId(): number {
  return 980_000_000 + Math.floor(Math.random() * 19_999_999);
}

describe.skipIf(!integrationEnabled)(
  'POST /api/events (live PostgreSQL)',
  () => {
    const createdDedupKeys: string[] = [];

    afterAll(async () => {
      if (createdDedupKeys.length > 0) {
        await prisma.rawEvent.deleteMany({
          where: { deduplicationKey: { in: createdDedupKeys } },
        });
      }

      await prisma.$disconnect();
    });

    it('accepts first snapshot with 202 and rejects duplicate with 409', async () => {
      const gameId = uniqueGameId();
      const deduplicationKey = `MATCH_SNAPSHOT:${gameId}`;
      const payload = withGameId(loadMatchSnapshotFixture(), gameId);

      const first = await request(app).post('/api/events').send(payload);

      expect(first.status).toBe(202);
      expect(first.body).toMatchObject({
        status: 'PENDING',
      });
      expect(first.body.id).toBeTruthy();
      expect(first.body).not.toHaveProperty('duplicate');

      createdDedupKeys.push(deduplicationKey);

      const rowCount = await prisma.rawEvent.count({
        where: { deduplicationKey },
      });
      expect(rowCount).toBe(1);

      const second = await request(app).post('/api/events').send(payload);

      expect(second.status).toBe(409);
      expect(second.body).toEqual({
        error: 'A snapshot for this game has already been ingested',
        code: 'DUPLICATE_SNAPSHOT',
        existingId: first.body.id,
      });

      const rowCountAfterDuplicate = await prisma.rawEvent.count({
        where: { deduplicationKey },
      });
      expect(rowCountAfterDuplicate).toBe(1);
    });

    it('returns 400 for invalid payload against live stack', async () => {
      const response = await request(app).post('/api/events').send({});

      expect(response.status).toBe(400);
      expect(response.body.code).toBe('INVALID_EVENT_TYPE');
    });
  },
);

describe.skipIf(integrationEnabled)(
  'POST /api/events (live PostgreSQL)',
  () => {
    it('skipped — set DATABASE_URL in server/.env to run integration tests', () => {
      expect(true).toBe(true);
    });
  },
);
