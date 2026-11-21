import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  markEventFailed,
  markEventPendingForRetry,
  markEventProcessed,
  markEventsProcessing,
  getPendingEventsBatch,
  reclaimStaleProcessingEvents,
} from '../models/rawEvent.model.js';
import { persistMatchSnapshot } from '../services/matchSnapshot.service.js';
import {
  loadMatchSnapshotFixture,
  mockRawEvent,
} from '../../tests/helpers/ingestFixtures.js';
import {
  MAX_RETRIES,
  processBatch,
  processSingleEvent,
} from './rawEventProcessor.js';

vi.mock('../models/rawEvent.model.js', () => ({
  getPendingEventsBatch: vi.fn(),
  reclaimStaleProcessingEvents: vi.fn(),
  markEventsProcessing: vi.fn(),
  markEventProcessed: vi.fn(),
  markEventFailed: vi.fn(),
  markEventPendingForRetry: vi.fn(),
}));

vi.mock('../services/matchSnapshot.service.js', () => ({
  persistMatchSnapshot: vi.fn(),
}));

const mockedGetPending = vi.mocked(getPendingEventsBatch);
const mockedReclaim = vi.mocked(reclaimStaleProcessingEvents);
const mockedMarkProcessing = vi.mocked(markEventsProcessing);
const mockedMarkProcessed = vi.mocked(markEventProcessed);
const mockedMarkFailed = vi.mocked(markEventFailed);
const mockedMarkRetry = vi.mocked(markEventPendingForRetry);
const mockedPersist = vi.mocked(persistMatchSnapshot);

describe('processSingleEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates MATCH_SNAPSHOT payloads to persistMatchSnapshot', async () => {
    const payload = loadMatchSnapshotFixture();
    const event = mockRawEvent({ payload });

    mockedPersist.mockResolvedValue(undefined);

    await processSingleEvent(event);

    expect(mockedPersist).toHaveBeenCalledWith(payload);
  });

  it('rejects unsupported event types', async () => {
    const event = mockRawEvent({ eventType: 'OTHER' });

    await expect(processSingleEvent(event)).rejects.toThrow(
      'Unsupported eventType: OTHER',
    );
    expect(mockedPersist).not.toHaveBeenCalled();
  });
});

describe('processBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedReclaim.mockResolvedValue(0);
  });

  it('reclaims stale PROCESSING events before polling PENDING', async () => {
    mockedGetPending.mockResolvedValue([]);

    await processBatch();

    expect(mockedReclaim).toHaveBeenCalledOnce();
    expect(mockedGetPending).toHaveBeenCalledOnce();
    const reclaimOrder = mockedReclaim.mock.invocationCallOrder[0];
    const pendingOrder = mockedGetPending.mock.invocationCallOrder[0];
    expect(reclaimOrder).toBeLessThan(pendingOrder);
  });

  it('marks a successful MATCH_SNAPSHOT event as PROCESSED (W1)', async () => {
    const event = mockRawEvent({
      id: 11n,
      payload: loadMatchSnapshotFixture(),
      retryCount: 0,
    });

    mockedGetPending.mockResolvedValue([event]);
    mockedPersist.mockResolvedValue(undefined);

    await processBatch();

    expect(mockedMarkProcessing).toHaveBeenCalledWith([11n]);
    expect(mockedMarkProcessed).toHaveBeenCalledWith(11n);
    expect(mockedMarkRetry).not.toHaveBeenCalled();
    expect(mockedMarkFailed).not.toHaveBeenCalled();
  });

  it('returns event to PENDING with error while retries remain (W2)', async () => {
    const event = mockRawEvent({
      id: 12n,
      retryCount: 0,
    });

    mockedGetPending.mockResolvedValue([event]);
    mockedPersist.mockRejectedValue(new Error('processing failed'));

    await processBatch();

    expect(mockedMarkRetry).toHaveBeenCalledWith(12n, 'processing failed');
    expect(mockedMarkFailed).not.toHaveBeenCalled();
    expect(mockedMarkProcessed).not.toHaveBeenCalled();
  });

  it(`marks event FAILED when retryCount reaches MAX_RETRIES - 1 (W3)`, async () => {
    const event = mockRawEvent({
      id: 13n,
      retryCount: MAX_RETRIES - 1,
    });

    mockedGetPending.mockResolvedValue([event]);
    mockedPersist.mockRejectedValue(new Error('processing failed'));

    await processBatch();

    expect(mockedMarkFailed).toHaveBeenCalledWith(13n, 'processing failed');
    expect(mockedMarkRetry).not.toHaveBeenCalled();
    expect(mockedMarkProcessed).not.toHaveBeenCalled();
  });

  it('does nothing when no pending events are available', async () => {
    mockedGetPending.mockResolvedValue([]);

    await processBatch();

    expect(mockedMarkProcessing).not.toHaveBeenCalled();
    expect(mockedPersist).not.toHaveBeenCalled();
  });

  it('marks PROCESSED when reprocess is idempotent after partial persist', async () => {
    const event = mockRawEvent({
      id: 14n,
      payload: loadMatchSnapshotFixture(),
      retryCount: 1,
    });

    mockedGetPending.mockResolvedValue([event]);
    // Crash recovery path: match already written; persist is a no-op success.
    mockedPersist.mockResolvedValue(undefined);

    await processBatch();

    expect(mockedMarkProcessed).toHaveBeenCalledWith(14n);
    expect(mockedMarkFailed).not.toHaveBeenCalled();
    expect(mockedMarkRetry).not.toHaveBeenCalled();
  });
});
