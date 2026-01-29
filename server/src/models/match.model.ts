import prisma from '../db/prisma.js';
import type {MatchInputDTO} from '../types/type.match.js'

// const mockMatchData : MatchInput = {
//         gameId : 100n,
//         gameDuration: 243,
//         gameCreationDate: new Date ("2025-01-29T10:00:00Z"),
//         createdAt: new Date ("2026-01-29T10:01:25Z"),
// };

async function createMatchData(data : MatchInputDTO) {
    return prisma.match.create({ data });
}

// find specific game_id of match

async function findGameId (id : MatchInputDTO['gameId'] ): Promise<bigint | null>{

    const row  = await prisma.match.findUnique({
        where : {
            gameId : id
        }
    }) // return "null" if not found

    return row?.gameId ?? null;

}

export default createMatchData ; 
export {findGameId}



