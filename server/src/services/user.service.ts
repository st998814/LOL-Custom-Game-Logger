const crypto = require('crypto');
import redisClient from '../db/redis.js';
import {
    LinkUserResult , type UserLinked
} from '../types/type.user.js';
import {findTgIdExistedByPuuid} from '../models/user.model.js'


const BOTNAME = "dev-bot"

function generateHexToken(bytes = 32):string {
  return crypto.randomBytes(bytes).toString('hex');
}

function buildKey(token:string):string{

    const tokenKey = `telegram_link:${token}`

    return tokenKey
}

async function setAuthToken(key: string, value: string | null, expireSeconds: number = 600) {
  try {
    const result = await redisClient.set(key, value, {
      EX: expireSeconds
    });

    return result === 'OK';
  } catch (error) {
    console.error(`Failed to set token ${key} in Redis:`, error);
    return false;
  }
}

function buildLink(botName:string , token:string):string{
    const deepLink = `https://t.me/${botName}?start=${token}`
    return deepLink
}





async function linkUser( puuid : string | null):Promise<LinkUserResult>  {
    // return tgid corresponding to the given puuid if found , else null
    const tgId = await findTgIdExistedByPuuid(puuid)
    
    if (!tgId){

        const token  = generateHexToken()
        // build key , set puuid as value and expiration
        const key  = buildKey(token)
        await setAuthToken(key,puuid)
        // tg /start link
        const link = buildLink(BOTNAME , token)

        return {status : "pending" , link : link }

    }else{

        return {status : "already_linked" , tgId : tgId}

    }

}



async function linkUsercomplete():Promise<UserLinked>| null{



}

export {linkUsercomplete,linkUser};