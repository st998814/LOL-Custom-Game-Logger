import prisma from '../db/prisma.js';
import type { Player } from '../../generated/prisma/client.js';

async function findTgIdExistedByPuuid(puuid:string): Promise<number | null> {

  const player = await prisma.player.findUnique({
    where: {puuid} , 
    select :{tgId : true },
  });

  return player?.tgId ?? null;
};

async function updateTgIdByPuuid(puuid:string , tgId : number):Promise<string | boolean>{
  
   const player =  await prisma.player.update({
    where :{puuid},
    data: {
        tgId
      },
  });
  const gameName = player.gameName
  console.log(gameName)
  // turn down the whole app if not found , should be address
  return gameName??false;
}



export {findTgIdExistedByPuuid,updateTgIdByPuuid};

