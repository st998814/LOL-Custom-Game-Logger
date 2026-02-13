import prisma from '../db/prisma.js';
import type {MatchInputDTO , Matches} from '../types/type.match.js'


async function createMatchData(data : Matches) {
    return prisma.match.create({ data });
}

// find specific game_id of match in database
async function findGameId (id : Matches['gameId'] ): Promise<number | null>{

    const row  = await prisma.match.findUnique({
        where : {
            gameId : id
        }
    }) // return "null" if not found

    return row?.gameId ?? null;

}
export default createMatchData ; 
export {findGameId}



