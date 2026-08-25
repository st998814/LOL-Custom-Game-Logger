import type { Request, Response } from 'express';
import {registerUser,linkUser} from '../services/user.service.js';
import {parsePuuidQuery} from '../services/stats.service.js'
function parsetgIdbody(req: Request): string | null {

  const tgId = req.body.telegramId.trim();

  if (typeof tgId !== 'string') return null;

  return tgId.length > 0 ? tgId : null;

}

function parsePlayerIdBody(req:Request): number | null{

    const playerId = req.params.playerId;

    if (typeof playerId !== 'number') return null;

    return playerId 

};




async function linkUserController(req: Request, res: Response){
    const puuid = parsePlayerIdBody(req)

    if (!puuid){
        return res.status(400).json({error:'Server failed to get unique puuid for linking'});
    }

    try{
        const userlink = await linkUser(tgId , palyerId);
        if(!userlink){
            return res.status(401).json({error:'Server failed to get Telegram ID for registration'});
        }
        return res.status(200).json(userlink);

    }catch(error){
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(400).json({ error: message });
    }
    
}

async function linkUserCompleteController(req:Request , res:Response){


    
}



export {linkUserController} ;