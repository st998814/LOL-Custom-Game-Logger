import type { Request, Response } from 'express';
import {linkUser,linkUserComplete} from '../services/user.service.js';



function parsePuuId(req:Request): string | null{

    const puuId = req.body.puuid;

    if (typeof puuId !== 'string' || !puuId) return null;

    return puuId 

};

function parseLinkToken(req:Request): string | null{

    const token = req.body.token;

    if (typeof token !== 'string'|| !token) return null;

    return token

};

function parseTgId(req:Request) : string | null {

    const tgId = req.body.tgId

    

    if (typeof tgId !== 'string'  || ! tgId) return null;

    return tgId

}


async function linkUserController(req: Request, res: Response){

    const puuid = parsePuuId(req)

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

    const token = parseLinkToken(req)
    const tgId = parseTgId(req)

    if (!token && !tgId){
        return res.status(400).json({error:'Server failed to get required ressource for linking'});
    }

    try{

        const userLinked = linkUserComplete(token,tgId)


    }catch (error){

        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(400).json({ error: message });


    }



    
};



export {linkUserController} ;