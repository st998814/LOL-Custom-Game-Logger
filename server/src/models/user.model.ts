import prisma from '../db/prisma.js';
import type { Player } from '../../generated/prisma/client.js';

async function findTgIdExistedByPuuid(puuid:string): Promise<number | null> {

  if (puuid === null) return null;

  const player = await prisma.player.findUnique({
    where: {puuid} , 
    select :{tgId : true },
  });

  return player?.tgId ?? null;
};

async function updateTgIdByPuuid(puuid:string , tgId : number):Promise<boolean>{
  
   if (puuid === null) return false;

   await prisma.player.update({
    where :{puuid},
    data: {
        tgId
      },
  });

  return true;
}



export {findTgIdExistedByPuuid,updateTgIdByPuuid};

