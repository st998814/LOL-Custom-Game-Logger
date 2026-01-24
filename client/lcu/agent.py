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


from aiohttp import BasicAuth , ClientSession
import asyncio
from dataclasses import dataclass ,field

from .credential_resolver import ProcessInspector, LCUCredential




# credentials data place holder
@dataclass(frozen = True)
class Credentials:
    port : int 
    token : str 

# URLs place holder
@dataclass
class URLs:
    credentials: Credentials
    base: str = field(init=False)
    suffix: dict = field(default_factory=lambda: {
        "GAME_FLOW": "lol-gameflow/v1/gameflow-phase",
        "EOG": "lol-end-of-game/v1/eog-stats-block",
        "SESSION": "lol-gameflow/v1/session",
        "MATCH": "lol-match-history/v1/games/"
    })

    def __post_init__(self):
        self.base = f"https://127.0.0.1:{self.credentials.port}/"



    
class Session:

    def __init__(self , creds : Credentials , urls : URLs):
        self._cred = creds
        self._urls = urls
        self._auth = BasicAuth("riot", creds.token)


class Client :

    def __init__(self):
        port , token= LCUCredential(ProcessInspector()).parse()
        creds = Credentials(port = port , token = token)
        urls = URLs(credentials = creds)
        self._session = Session(creds , urls )
        
        

    
    def _create_session(self)->ClientSession:
        session =  ClientSession(base_url = self._session._urls.base , auth = self._session._auth )

        return session 
    
    def get_suffix(self,api_name:str)->str:

        if api_name in self._session._urls.suffix:
            suffix = self._session._urls.suffix[api_name]
            
        else:
            raise ValueError (f'Invalid API name:{api_name}')

        return suffix


    async def request(self , api_name:str , game_id = None):

        if not game_id:
            suffix = self.get_suffix(api_name)
        else:
            suffix = self.get_suffix(api_name)+f'{game_id}'

        async with self._create_session() as session :
            async with session.get(suffix, ssl=False) as response:
                print(response.status)
                return await response.json() # Read response’s body as JSON, return dict using specified encoding and loader. src : https://docs.aiohttp.org/en/stable/client_reference.html#aiohttp.ClientResponse


    
    def __str__(self):
        pass



class DataFetch(Client):

    def __init__(self):
        super().__init__()

    async def polling_game_phase(self):
        
        phase = "init"

        while True : 
        # polling game flow status
            await asyncio.sleep(1)
            phase = await self.request("GAME_FLOW")

            if phase == "InProgress":
                print("Match Started")
                return ("Matching", 0 )
      

            elif phase == "WaitingForStats":
                print("Match Over")
                return ("MatchOver", 1)

            else:
                continue
    
    async def fecth_game_id(self):

        phase , phase_code  = await self.polling_game_phase()

        if phase == "Matching" :
            match_session = await self.request("SESSION")


        # if the game is not custom or average team member != 1 , discard
        players_per_team : int = match_session["gameData"]["queue"]["numPlayersPerTeam"]
        is_custom_game : bool = match_session["gameData"]["isCustomGame"]


        game_id = match_session["gameData"]['gameId']

        # break the polling entirely
        # if players_per_team != 1 or not is_custom_game:
        if not is_custom_game:
            return False
        else:
            print(f'{game_id}')
            return game_id 


    async def fetch_match_data(self , game_id : int) -> dict:
        while True:
            phase , phase_code  = await self.polling_game_phase()

            if phase == "MatchOver":
                await asyncio.sleep(15)
                match_data = await self.request("MATCH" , game_id)
                break
        return match_data


    async def get_raw_data(self)->dict:
        
        game_id = await self.fecth_game_id()

        if not game_id :
            print("That is not a valid 1vs1 game")
            return {"error": "Invalid Game Type"}
        else:
            match_data = await self.fetch_match_data(game_id)

        return match_data

            






        

        



    





        
    
    












        




                
                
            



    








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
                      
                



