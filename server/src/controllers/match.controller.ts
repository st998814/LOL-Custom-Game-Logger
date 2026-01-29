import type { Request, Response } from 'express';
import  createMatchService  from '../services/match.service.js';

async function createMatchController(req :Request , res : Response){

    // get the payload from client
    const payload = req.body
    
    const match  = await createMatchService(payload)

    
    const response = {
        ...match,
        gameId: typeof match.gameId === 'bigint'
        ? match.gameId.toString()
        : match.gameId,
    };

    return res.status(201).json(response)

}

export default createMatchController ; 