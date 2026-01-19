"""
Module Name: Client-side agent

Description:
    A client-side agent that interacts with LCU

Responsibilities:
    - Polling LCU status
    - Make Request to LCU for getting match metadata

Author: Steven
Created: 2026-01-18
"""

import aiohttp
from aiohttp import BasicAuth , ClientSession
import asyncio
import time
from dataclasses import dataclass ,field


from credential_resolver import ProcessInspector , LCUCredential



# cred = LCUCredential(ProcessInspector())
# port,token = cred.parse()
# auth_header = BasicAuth("riot" , token)


# BASE_URL = f'https://127.0.0.1:{port}'
# REQUEST_URL = {
#     "GAME_FLOW":f'{BASE_URL}/lol-gameflow/v1/gameflow-phase', # game phases 
#     "EOG":f'{BASE_URL}/lol-end-of-game/v1/eog-stats-block', 
#     "SESSION":f'{BASE_URL}/lol-gameflow/v1/session', # on-going game info 
#     "MATCH" : f'{BASE_URL}/lol-match-history/v1/games/' # match info

# }

# # parse the credentials
# port , token= LCUCredential(ProcessInspector()).parse()


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
                return await response.json()


    
    def __str__(self):
        pass


async def main():

    client = Client()
    phase = "init"

    while phase != "InProgress":
                
        # polling game flow status
        await asyncio.sleep(1)
        phase = await client.request("GAME_FLOW")
        print(phase)
            

    match_session = await client.request("SESSION")
    game_id = match_session["gameData"]['gameId']

    while True : 
        match_data = await client.request("MATCH" , game_id)
            
        if "errorCode" in match_data :
            continue
        else:
            break

    print(type(match_data))
        
    
    












        




                
                
            



    





asyncio.run(main())



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
                      
                



