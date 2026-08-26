import type { Request, Response } from 'express';
import {registerUser,linkUser} from '../services/user.service.js';
import {parsePuuidQuery} from '../services/stats.service.js'

function parsetgIdbody(req: Request): string | null {

  const tgId = req.body.telegramId.trim();

  if (typeof tgId !== 'string') return null;

  return tgId.length > 0 ? tgId : null;

}

function parsePuuIdBody(req:Request): string | null{

    const puuId = req.params.puuid;

    if (typeof puuId !== 'string') return null;

    return puuId 

};




async function linkUserController(req: Request, res: Response){

    const puuid = parsePuuIdBody(req)

    if (!puuid){
        return res.status(400).json({error:'Server failed to get unique puuid for linking'});
    }

    try{
        const userlink = await linkUser(puuid);

        switch (userlink.status){

            case "pending" : {
                return res.status(200).json(userlink)
            }

            case "already_linked" : {

                return res.status(409).json(userlink)
            }

        }

    }catch(error){
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(400).json({ error: message });
    }
    
}

async function linkUserCompleteController(req:Request , res:Response){


    
}



export {linkUserController} ;