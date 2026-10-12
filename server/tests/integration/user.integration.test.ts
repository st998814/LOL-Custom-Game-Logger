import 'dotenv/config';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const integrationEnabled = Boolean(process.env.DATABASE_URL);

// Larger than 2^31: would overflow the old INTEGER tg_id column.
const LARGE_TG_ID = 6_000_000_000n;

function uniquePuuid(label: string): string {
  return `it-user-${label}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

describe.skipIf(!integrationEnabled)('user link model (live PostgreSQL)', () => {
  // Imported lazily: db/prisma.ts throws at import time without DATABASE_URL.
  let prisma: typeof import('../../src/db/prisma.js').default;
  let model: typeof import('../../src/models/user.model.js');
  const createdPuuids: string[] = [];

  beforeAll(async () => {
    prisma = (await import('../../src/db/prisma.js')).default;
    model = await import('../../src/models/user.model.js');
  });

  afterAll(async () => {
    if (createdPuuids.length > 0) {
      await prisma.player.deleteMany({ where: { puuid: { in: createdPuuids } } });
    }
    await prisma.$disconnect();
  });

  async function createPlayer(label: string): Promise<string> {
    const puuid = uniquePuuid(label);
    createdPuuids.push(puuid);
    await prisma.player.create({ data: { puuid, gameName: 'ItHost', tagLine: 'OCE' } });
    return puuid;
  }

  it('reports an unknown PUUID as not registered', async () => {
    await expect(model.findPlayerLinkState(uniquePuuid('unknown'))).resolves.toBeNull();
  });

  it('stores and reads back a Telegram id larger than 2^31', async () => {
    const puuid = await createPlayer('large');

    await expect(model.setTgIdByPuuid(puuid, LARGE_TG_ID)).resolves.toBe('ItHost');
    await expect(model.findPlayerLinkState(puuid)).resolves.toEqual({ tgId: LARGE_TG_ID });
  });

  it('rejects a Telegram id already bound to another player with P2002', async () => {
    const first = await createPlayer('first');
    const second = await createPlayer('second');
    const tgId = LARGE_TG_ID + 1n;
    await model.setTgIdByPuuid(first, tgId);

    await expect(model.setTgIdByPuuid(second, tgId)).rejects.toMatchObject({ code: 'P2002' });
  });

  it('fails with P2025 when the PUUID has no players row', async () => {
    await expect(
      model.setTgIdByPuuid(uniquePuuid('missing'), LARGE_TG_ID + 2n),
    ).rejects.toMatchObject({ code: 'P2025' });
  });
});
