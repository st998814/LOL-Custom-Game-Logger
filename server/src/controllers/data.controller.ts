import type { Request, Response } from 'express';

async function recieveDataController(req :Request , res : Response){

    // get the payload from client

    const payload = req.body

    const timestampMs = Date.now();

    const dataRecievedMsg = `Data recieved successfully at ${timestampMs}`

    return res.status(200).json(dataRecievedMsg)




}

export default recieveDataController ; 