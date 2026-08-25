const crypto = require('crypto');
import type {
    linkingUser , UserLinked
} from '../types/type.user.js';
import {findTgIdExistedByPuuid} from '../models/user.model.js'


const BOTNAME = "dev-bot"

function generateHexToken(bytes = 32):string {
  return crypto.randomBytes(bytes).toString('hex');
}

function buildLink(botName , token):string{
    const deepLink = `https://t.me/${botName}?start=${token}`
    return deepLink
}
async function linkUser( puuid : string | null):Promise<linkingUser>| null {
//puuid <-> tgid

// if tgid existed , return null

const tgId = findTgIdExistedByPuuid(puuid)

if (!tgId){
// token  , link 
    const token  = generateHexToken()
    const link = buildLink(BOTNAME , token)
    

}









}

async function linkUsercomplete():Promise<UserLinked>| null{



}

export {linkUsercomplete,linkUser};