import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getPendingEventsBatch, reclaimStaleProcessingEvents } from '../models/rawEvent.model.js';
import { startRawEventProcessorLoop } from './rawEventProcessor.js';

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

describe('startRawEventProcessorLoop shutdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedReclaim.mockResolvedValue(0);
    mockedGetPending.mockResolvedValue([]);
  });

  it('exits promptly when the abort signal fires', async () => {
    const abort = new AbortController();

    const loop = startRawEventProcessorLoop(abort.signal);
    abort.abort();

    await expect(loop).resolves.toBeUndefined();
    expect(mockedReclaim).toHaveBeenCalled();
  });
});
