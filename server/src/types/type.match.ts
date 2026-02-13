
// data that sent by client side
type MatchInputDTO = {
  gameId: number;
  gameDuration: number;
  gameCreationDate: string; 
  
};

// data in matches table
type Matches = {
  gameId : number
  gameDuration: number;
  gameCreationDate: Date;
  createdAt : Date ; 

}


export type { MatchInputDTO , Matches};

