import  createMatchData , {findGameId} from '../models/match.model.js';
import type {MatchInputDTO} from '../types/type.match.js'


async function createMatchService (matchPayload : MatchInputDTO ) {

    const existingGameId = await findGameId(matchPayload.gameId) 

    // if found , the payload should be invalid
    if (existingGameId!== null){
        throw new Error(`Match ID : ${existingGameId} is invalid`)
    }



    // transfer data type and add creation timestamp
    





    return createMatchData(payload);   
};



export default createMatchService ; 