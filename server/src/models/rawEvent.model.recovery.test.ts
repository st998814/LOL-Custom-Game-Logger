import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/prisma.js', () => ({
  default: {
    rawEvent: {
      updateMany: vi.fn(),
    },
  },
}));

const { default: prisma } = await import('../db/prisma.js');
const {
  STALE_PROCESSING_MESSAGE,
  STALE_PROCESSING_MS,
  reclaimStaleProcessingEvents,
  markEventsProcessing,
} = await import('./rawEvent.model.js');

const mockedUpdateMany = vi.mocked(prisma.rawEvent.updateMany);

describe('reclaimStaleProcessingEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateMany.mockResolvedValue({ count: 2 });
  });

  it('returns PROCESSING rows older than the lease (or with null lease) to PENDING', async () => {
    const count = await reclaimStaleProcessingEvents(60_000);

    expect(count).toBe(2);
    expect(mockedUpdateMany).toHaveBeenCalledOnce();

    const arg = mockedUpdateMany.mock.calls[0][0];
    expect(arg.where).toMatchObject({
      status: 'PROCESSING',
    });
    expect(arg.where.OR).toEqual([
      { processedAt: null },
      { processedAt: { lt: expect.any(Date) } },
    ]);
    expect(arg.data).toEqual({
      status: 'PENDING',
      processedAt: null,
      errorMessage: STALE_PROCESSING_MESSAGE,
    });

    const cutoff = arg.where.OR[1].processedAt.lt as Date;
    const ageMs = Date.now() - cutoff.getTime();
    expect(ageMs).toBeGreaterThanOrEqual(59_000);
    expect(ageMs).toBeLessThanOrEqual(61_000);
  });

  it('defaults to STALE_PROCESSING_MS', async () => {
    mockedUpdateMany.mockResolvedValue({ count: 0 });

    await reclaimStaleProcessingEvents();

    const cutoff = mockedUpdateMany.mock.calls[0][0].where.OR[1].processedAt
      .lt as Date;
    const ageMs = Date.now() - cutoff.getTime();
    expect(ageMs).toBeGreaterThanOrEqual(STALE_PROCESSING_MS - 1_000);
    expect(ageMs).toBeLessThanOrEqual(STALE_PROCESSING_MS + 1_000);
  });
});

describe('markEventsProcessing lease', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUpdateMany.mockResolvedValue({ count: 1 });
  });

  it('sets processedAt as the PROCESSING lease timestamp', async () => {
    await markEventsProcessing([9n]);

    expect(mockedUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: [9n] } },
      data: {
        status: 'PROCESSING',
        retryCount: { increment: 1 },
        processedAt: expect.any(Date),
        errorMessage: null,
      },
    });
  });

  it('no-ops for an empty id list', async () => {
    await markEventsProcessing([]);
    expect(mockedUpdateMany).not.toHaveBeenCalled();
  });
});
