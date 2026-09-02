import type { Request, Response } from 'express';
import {linkUser,linkUserComplete} from '../services/user.service.js';



function parsePuuId(req:Request): string{

    const puuId = req.body.puuid;

    if (typeof puuId !== "string" || puuId.length === 0) {

        throw new Error("Invalid or missing puuid");

    }
    return puuId;


};

function parseLinkToken(req:Request): string {

    const token = req.body.token;
    
        if (typeof token !== "string" || token.length === 0) {

        throw new Error("Invalid or missing token");

    }
    return token

};

function parseTgId(req:Request) : number {

    const tgId = req.body.tgId

    if (typeof tgId !== "number" ) {

        throw new Error("Invalid or missing token");

    }
    return tgId
}


async function linkUserController(req: Request, res: Response){

    const puuid = parsePuuId(req)

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
        console.log(error)
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(400).json({ error: message });
    }
    
}

async function linkUserCompleteController(req:Request , res:Response){

    const token = parseLinkToken(req)
    const tgId = parseTgId(req)
    try{

        const userLinked = linkUserComplete(token,tgId)

        return res.status(200).json(userLinked)

    }catch (error){
        console.log(error)
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(400).json({ error: message });

    }    
};



export {linkUserController} ;