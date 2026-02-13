import type { Request, Response } from 'express';
import  createMatchService  from '../services/match.service.js';
import type {MatchInputDTO} from '../types/type.match.js'

async function createMatchController(req :Request , res : Response){

    // get the payload from client
    const payload = req.body

    const matchPayload : MatchInputDTO = {
        gameId : payload.gameId,
        gameDuration : payload.gameDuration,
        gameCreationDate : payload.gameCreationDate
    };
    
    const match  = await createMatchService(matchPayload)

    if (match){
        return res.status(201).json()
    }
    
}

export default createMatchController ; 