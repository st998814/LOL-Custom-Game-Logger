import prisma from '../db/prisma.js';
import type { Player } from '../../generated/prisma/client.js';

async function findTgIdExistedByPuuid(puuid:string | null): Promise<number | null> {

  if (puuid === null) return null;

  const player = await prisma.player.findUnique({
    where: {puuid} , 
    select :{tgId : true },
  });
  
  return player?.tgId ?? null;
};

async function upsertTgIdByPuuid(puuid:string|null , tgId : number | null):Promise<boolean>{
  
   if (puuid === null) return false;

   await prisma.player.update({
    where :{puuid},
    data: {
        tgId
      },
  });

  return true;
}



export {findTgIdExistedByPuuid,upsertTgIdByPuuid};

