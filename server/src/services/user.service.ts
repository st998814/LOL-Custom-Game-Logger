import crypto from 'node:crypto';
import redisClient from '../db/redis.js';
import type {
    LinkUserResult , UserLinked
} from '../types/type.user.js';
import {findTgIdExistedByPuuid} from '../models/user.model.js'


const BOTNAME = "Dev962299Bot"

function generateHexToken(bytes = 32):string {
  return crypto.randomBytes(bytes).toString('hex');
}

function buildKey(token:string):string{

    const tokenKey = `telegram_link:${token}`

    return tokenKey
}

async function setAuthToken(key: string, value: string | null, expireSeconds: number = 600):Promise<boolean> {

    if (value === null) {
      return false;
    }
    const result = await redisClient.set(key, value, {
      EX: expireSeconds
    });
    return result === 'OK';

}

function buildLink(botName:string , token:string):string{
    const deepLink = `https://t.me/${botName}?start=${token}`
    return deepLink
}

async function verifyToken(token:string|null):Promise<string|boolean>{

  if (token === null){
    return false
  }

  const puuid = await redisClient.get(token);

  return puuid || false
  
}



async function linkUser( puuid : string | null):Promise<LinkUserResult>  {
    // return tgid corresponding to the given puuid if found , else null
    const tgId = await findTgIdExistedByPuuid(puuid)
    
    if (!tgId){

        const token  = generateHexToken()
        // build key , set puuid as value and expiration
        const key  = buildKey(token)
        await setAuthToken(key , puuid)
        // tg /start link
        const link = buildLink(BOTNAME , token)

        return {status : "pending" , link : link }

    }else{

        return {status : "already_linked" , tgId : tgId}

    }

}



async function linkUserComplete(token:string | null , tgId : string | null):Promise<UserLinked>| null{

  const puuid = verifyToken(token)

  




}

export {linkUserComplete,linkUser};