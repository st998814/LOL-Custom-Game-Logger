import prisma from '../db/prisma.js';
import type { Player } from '../../generated/prisma/client.js';

async function findTgIdExistedByPuuid(puuid:string | null): Promise<number | null> {
  const player = await prisma.player.findUnique({
    where: {puuid : puuid} , 
    select :{tgId : true },
  });
  return player?.tgId ?? null;
};




export {findTgIdExistedByPuuid};

