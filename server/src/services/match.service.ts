import  createMatchData , {findGameId} from '../models/match.model.js';
import type {MatchInputDTO} from '../types/type.match.js'


async function createMatchService (payload : MatchInputDTO ) {

    const existingGameId = await findGameId(payload.gameId) 

    // if found , the payload should be invalid
    if (existingGameId!== null){
        throw new Error(`Match ID : ${existingGameId} is invalid`)
    }

    return createMatchData(payload);   
};

export default createMatchService ; 