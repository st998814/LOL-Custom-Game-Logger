# class Colloctor:

#     def __init__(self , connection : Connection):
#         self.connection = connection
#         self.phase : LCUResponse | None = None


#     async def poll_game_flow(self)->None:

#         await asyncio.sleep(1)

#         self.phase = await self.connection.request("GAME_FLOW")

    

        
    
#     async def fecth_game_id(self):

 
#         await self.poll_game_flow()

#         log.info("Waiting for the match start")

#         while self.phase.payload!= "InProgress":
            
#             await self.poll_game_flow()

#         await asyncio.sleep(1)

#         match_session = await self.connection.request("SESSION")

#         payload = match_session.payload


#         if not isinstance(payload , dict):
#             raise error.InvalidSummonerPayloadError('Payload is not a dict')
        
#         required_key = "gameId"

#         if required_key not in payload["gameData"]:
#             raise error.InvalidSummonerPayloadError('Incomplete Payload')
        
#         gameId = payload["gameData"]["gameId"]

#         if not gameId:
#             raise error.InvalidSummonerPayloadError('Empty required fields')
    
 

#         log.info(f'Game ID : {gameId}')

#         return gameId 



#     async def get_raw_data(self, gameId: int, attempts: int = 5) -> dict:

#         log.info("Waiting for the match completion")

#         while self.phase.payload != "WaitingForStats":

#             await self.poll_game_flow()
#             log.info(self.phase.payload)

#         for attempt in range(1, attempts + 1):
#             await asyncio.sleep(3)
#             log.info("Fetching match data attempt %s/%s", attempt, attempts)

#             match_data = await self.connection.request("MATCH", gameId)
#             log.info("MATCH status: %s", match_data.status_code)

#             payload = match_data.payload

#             if payload:
#                 log.info("Match data fetched successfully")
#                 return dict(payload)

#             log.info("Failed at attempt %s/%s, try again", attempt, attempts)

#         raise error.LCUWorkflowError(
#             f"Match snapshot for game {gameId} was unavailable from LCU match-history "
#             f"after {attempts} attempts."
#         )


        
        

            