import type { Request, Response } from 'express';
import { completeLink, requestLink } from '../services/user.service.js';
import { UserLinkError } from '../errors/user.errors.js';



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
    console.log(typeof tgId)


    if (typeof tgId !== "number" ) {

        throw new Error("Invalid or missing token");

    }
    return tgId
}


async function linkUserController(req: Request, res: Response){

    const puuid = parsePuuId(req)

    try{
        const ticket = await requestLink(puuid);
        return res.status(200).json(ticket)

    }catch(error){
        if (error instanceof UserLinkError) {
            return res.status(error.status).json({ error: error.message, code: error.code });
        }
        console.log(error)
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(400).json({ error: message });
    }
    
}

async function linkUserCompleteController(req:Request , res:Response){

    const token = parseLinkToken(req)
    const tgId = parseTgId(req)
    try{

        const linked = await completeLink(token,tgId)

        return res.status(200).json(linked)

    }catch (error){
        if (error instanceof UserLinkError) {
            return res.status(error.status).json({ error: error.message, code: error.code });
        }
        console.log(error)
        const message = error instanceof Error ? error.message : 'Unknown error';
        return res.status(400).json({ error: message });

    }    
};



export {linkUserController ,linkUserCompleteController} ;