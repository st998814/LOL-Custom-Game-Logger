import { describe, expect, it } from 'vitest';

import {
  DuplicateSnapshotError,
  IngestValidationError,
} from '../errors/ingest.errors.js';
import { buildIngestAcceptedBody, mapIngestError } from './ingestHttp.js';
import { mockRawEvent } from '../../tests/helpers/ingestFixtures.js';

describe('ingestHttp', () => {
  it('builds 202 accepted body without duplicate field', () => {
    const body = buildIngestAcceptedBody(mockRawEvent({ id: 5n }));

    expect(body).toEqual({
      id: '5',
      status: 'PENDING',
    });
    expect(body).not.toHaveProperty('duplicate');
  });

  it('maps DuplicateSnapshotError to 409', () => {
    const mapped = mapIngestError(
      new DuplicateSnapshotError('already ingested', 12n),
    );

    expect(mapped).toEqual({
      status: 409,
      body: {
        error: 'already ingested',
        code: 'DUPLICATE_SNAPSHOT',
        existingId: '12',
      },
    });
  });

  it('maps IngestValidationError to 400', () => {
    const mapped = mapIngestError(
      new IngestValidationError('missing game id', 'MISSING_GAME_ID'),
    );

    expect(mapped).toEqual({
      status: 400,
      body: {
        error: 'missing game id',
        code: 'MISSING_GAME_ID',
      },
    });
  });

  it('returns null for unknown errors', () => {
    expect(mapIngestError(new Error('boom'))).toBeNull();
  });
});
