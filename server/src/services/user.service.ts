import type {
    UserRegistered , UserLinked
} from '../types/type.user.js';

import {checkTgIdExisted , createNewPlayerByTgId} from '../models/user.model.js'





async function registerUser(tgId:string,req:Request):Promise<UserRegistered| null> {

  const tgIdExisted = await checkTgIdExisted(tgId)

  if (tgIdExisted !== null){
        return null 
    }

  const player = await createNewPlayerByTgId(tgId)

  if (player === null) {
    return null
  }

  const userRegistered : UserRegistered = {

        message : "Success",
        tgId : tgId,
        playerId : player.playerId
  }

  return userRegistered

  
}

async function linkUser(tgId:string | null, playerId : number | null)::Promise<UserLinked>| null {

   
}

export {registerUser,linkUser};