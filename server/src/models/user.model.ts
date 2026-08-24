import prisma from '../db/prisma.js';
import type { Player } from '../../generated/prisma/client.js';


async function checkTgIdExisted(tgId: number |null): Promise<Player | null> {
  return prisma.player.findUnique({
    where: { tgId },
  });
}

async function createNewPlayerWithTgId(tgId:string): Promise<Player|null>{
  return prisma.player.create({
    data: {
      tgId : tgId
    }, 
  })

}

async function upserttgIdByPlayerId(playerId : string , tgId : number | null) {

  return prisma.player.update({
    where: {
        playerId: playerId
    },
    data: {
        tgId: tgId,
    },
  })
}


export {checkTgIdExisted,createNewPlayerWithTgId,upserttgIdByPlayerId};

