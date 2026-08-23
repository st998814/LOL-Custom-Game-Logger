import prisma from '../db/prisma.js';
import type { Player } from '../../generated/prisma/client.js';


async function checkTgIdExisted(tgId: string): Promise<Player | null> {
  return prisma.player.findUnique({
    where: { tgId },
  });
}

async function createNewPlayerByTgId(tgId:string): Promise<Player|null>{
  return prisma.player.create({
    data: {
      tgId : tgId
    }, 
  })

}
export {checkTgIdExisted,createNewPlayerByTgId};

