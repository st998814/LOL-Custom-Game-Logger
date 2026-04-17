"""
Module Name: Client-side agent

Description:
    A client-side agent that interacts with LCU

Responsibilities:
    - Polling LCU status

    - Get the raw data of match


Author: Steven
Created: 2026-01-18
"""


from aiohttp import BasicAuth , ClientSession , ClientError
import asyncio
from dataclasses import dataclass ,field 
import logging
import json

import error

log= logging.getLogger(__name__)


@dataclass(frozen = True)
class Credentials:
    port : int 
    token : str 


@dataclass
class URLs:
    credentials: Credentials
    base: str = field(init=False)
    suffix: dict = field(default_factory=lambda: {
        "GAME_FLOW": "lol-gameflow/v1/gameflow-phase",
        "EOG": "lol-end-of-game/v1/eog-stats-block",
        "SESSION": "lol-gameflow/v1/session",
        "MATCH": "lol-match-history/v1/games/",
        "CUR_SUMMONER" : "/lol-summoner/v1/current-summoner"
    })

    def __post_init__(self):
        self.base = f"https://127.0.0.1:{self.credentials.port}/"

@dataclass
class LCUResponse:
    status_code : int
    payload  : any



@dataclass
class CurrentSummoner:
    puuid : int
    game_name : str
    tagline : str


class RequestHandlingException(Exception):
    """Exception raised for single request"""
    def __init__(self, api_name):
        self.message = f'Failed to handle {api_name} request'
        super().__init__(self.message)


    def __str__(self):
        return f'{self.message}'


    
class Session:

    def __init__(self , creds : Credentials , urls : URLs):
        self._cred = creds
        self._urls = urls
        self._auth = BasicAuth("riot", creds.token)


class Agent :

    def __init__(self, port , token):
        creds = Credentials(port = port , token = token)
        urls = URLs(credentials = creds)
        self._session = Session(creds , urls)
        
        
    
    def _create_session(self) -> ClientSession:
        session =  ClientSession(base_url = self._session._urls.base , auth = self._session._auth )

        return session 
    
    def get_suffix(self,api_name:str)->str:

        if api_name in self._session._urls.suffix:
            suffix = self._session._urls.suffix[api_name]
            
        else:
            raise ValueError (f'Invalid API name:{api_name}')

        return suffix


    async def request(self , api_name:str , spec = None) -> LCUResponse:

        if not spec:
            suffix = self.get_suffix(api_name)
        else:
            suffix = self.get_suffix(api_name)+f'{spec}'

        try :

            async with self._create_session() as session :
            
                    async with session.get(suffix, ssl=False) as response:

                        status_code =response.status

                        try:
                            payload = await response.json()
                        except json.JSONDecodeError as e:
                            raise error.LCUResponseParseError (
                        f"Failed to parse JSON response from API '{api_name}'"
                                                         ) from e                    

                        return LCUResponse(status_code = status_code , payload = payload )
                    
        except asyncio.TimeoutError as e:
            raise error.LCURequestError(
            f"Request to API '{api_name}' timed out"
        ) from e

        except ClientError as e :
            raise error.LCURequestError(
            f"Request to API '{api_name}' timed out"
        ) from e           

    def __str__(self):
        pass


# validate the connection between LCU and server-side client
class Connection(Agent):

    def __init__(self , port , token):
        super().__init__(port, token)
        self.response : LCUResponse | None = None


    # for validating connection
    async def build_summoner_info(self) :
                 
        await asyncio.sleep(1)


        self.response = await self.request('CUR_SUMMONER')

        payload = self.response.payload

        # check type 
        if not isinstance(payload , dict):
            raise error.InvalidSummonerPayloadError('Payload is not a dict')


        required_keys  = ("puuid" ,"gameName" , "tagLine")


        # check the existence for expected key
        if not all(key in payload for key in required_keys):
            raise error.InvalidSummonerPayloadError('Incomplete Payload')

       
        puuid , game_name , tagline = payload["puuid"] , payload["gameName"] , payload["tagLine"]

        # check if these is empty value for the key 

        if not puuid or not game_name or not tagline :
            raise error.InvalidSummonerPayloadError('Empty required fields')
            



        summoner_info = CurrentSummoner(puuid = puuid , game_name = game_name, tagline=tagline)

        welcome_msg = f'Welcome {summoner_info.game_name}\nID:{summoner_info.id}\nTagline : #{summoner_info.tagline} ' 

        log.info(welcome_msg)

   


    def __str__(self):
        return f'status :{self.phase["status_code"]} , phase : {self.phase["status"]}'
    

    




class Colloctor:

    def __init__(self , connection : Connection):
        self.connection = connection
        self.phase : LCUResponse | None = None


    async def poll_game_flow(self)->None:

        await asyncio.sleep(1)

        self.phase = await self.connection.request("GAME_FLOW")

    

        
    
    async def fecth_game_id(self):

 
        await self.poll_game_flow()

        log.info("Waiting for the match start")

        while self.phase.payload!= "InProgress":
            
            await self.poll_game_flow()

        asyncio.sleep(1)



        match_session = await self.connection.request("SESSION")

        payload = match_session.payload


        if not isinstance(payload , dict):
            raise error.InvalidSummonerPayloadError('Payload is not a dict')
        
        required_key = "gameId"

        if required_key not in payload["gameData"]:
            raise error.InvalidSummonerPayloadError('Incomplete Payload')
        
        gameId = payload["gameData"]["gameId"]

        if not gameId:
            raise error.InvalidSummonerPayloadError('Empty required fields')
    
 

        log.info(f'Game ID : {gameId}')

        return gameId 



    async def get_raw_data(self , gameId : int ,attemp : int = 5)->dict:
        
        log.info("Waiting for the match completion")

        while self.phase.payload!= "WaitingForStats":
           
            await self.poll_game_flow()

        n = 1
        while n < attemp:

            await asyncio.sleep(3)

            match_data = await self.connection.request("MATCH" , gameId)

            payload = match_data.payload

            if not payload:
                log.info(f'Failed at {n} attemp(s) , try again')
                n += 1
                continue

        return dict(match_data.payload)
        

            


            






        

        



    





        
    
    












        




                
                
            



    








# # seperated fetches with a single session 
# async def fetch(session, url:str):
#     async with session.get(url ,ssl = False) as response:
#         print(response.status)
#         print(url)
#         return await response.json()



# async def main():
#     async with aiohttp.ClientSession(auth = auth_header) as session:


#         while True :

#             # checking game phase
            
#             await asyncio.sleep(1)
#             phase = await fetch(session, REQUEST_URL["GAME_FLOW"])
#             print(phase)


#             if phase == "InProgress":
#                 # start fetching game_id 
                
#                 await asyncio.sleep(1)
#                 session_data = await fetch(session , REQUEST_URL["SESSION"])
#                 game_id = session_data["gameData"]['gameId']
#                 print(game_id)

#             # polling till phase == InProgress
#             else:
#                 continue
#             match_data = await fetch(session , REQUEST_URL["MATCH"]+f'{game_id}')
#             print(match_data)
                      
                


