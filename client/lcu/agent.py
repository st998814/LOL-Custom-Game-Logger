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
from dataclasses import dataclass ,field , asdict
import logging

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
        "MATCH": "lol-match-history/v1/games/"
    })

    def __post_init__(self):
        self.base = f"https://127.0.0.1:{self.credentials.port}/"

@dataclass
class LCUResponse:
    status_code : int
    payload  : dict





    
class Session:

    def __init__(self , creds : Credentials , urls : URLs):
        self._cred = creds
        self._urls = urls
        self._auth = BasicAuth("riot", creds.token)


class Client :

    def __init__(self, port , token):
        # port , token= LCUCredential(ProcessInspector()).parse()
        creds = Credentials(port = port , token = token)
        urls = URLs(credentials = creds)
        self._session = Session(creds , urls )
        
        

    
    def _create_session(self) -> ClientSession:
        session =  ClientSession(base_url = self._session._urls.base , auth = self._session._auth )

        return session 
    
    def get_suffix(self,api_name:str)->str:

        if api_name in self._session._urls.suffix:
            suffix = self._session._urls.suffix[api_name]
            
        else:
            raise ValueError (f'Invalid API name:{api_name}')

        return suffix


    async def request(self , api_name:str , game_id = None) -> dict:

        if not game_id:
            suffix = self.get_suffix(api_name)
        else:
            suffix = self.get_suffix(api_name)+f'{game_id}'

        async with self._create_session() as session :
            async with session.get(suffix, ssl=False) as response:

                status_code =response.status
                payload = await response.json() # Read response’s body as JSON, return dict using specified encoding and loader. src : https://docs.aiohttp.org/en/stable/client_reference.html#aiohttp.ClientResponse

                return asdict(LCUResponse(status_code = status_code , payload = payload ))

    
    def __str__(self):
        pass



# polling game phase 
class Connection(Client):

    def __init__(self , port , token):
        super().__init__(port, token)
        self.phase : dict = {"status_code" : 000 , "payload" : "init"}

    async def poll(self) -> None:
                 
        await asyncio.sleep(1)
        self.phase = await self.request("GAME_FLOW") # update self.phase




    def get_phase(self)->dict:

        return self.phase

    def __str__(self):
        return f'status :{self.phase["status_code"]} , phase : {self.phase["payload"]}'
    
    async def check_connection(self)->bool:
        await self.poll()

        if self.phase["status_code"] == 404:
            return False     
        return True



        

        




class Colloctor:

    def __init__(self , connection : Connection):
        self.connection = connection

    async def fecth_game_id(self):

        print("Waiting for the match start")
        while self.connection.phase["payload"] != "InProgress":
            
            await self.connection.poll()

        match_session = await self.connection.request("SESSION")
        #print(match_session)

        game_id = match_session["payload"]["gameData"]['gameId']
        log.info(f'Game ID : {game_id}')

        return game_id if game_id else False




    # 2026/03/16
    # issue  : stuack at " Waitingfor the match end" after real match with other player 
    #NOTE : second match  , the oppopsite player quit first , then I quit , came up with expected result
    async def get_raw_data(self  , game_id : int ,attemp : int = 5)->dict:
        
        log.info("Waiting for the match completion")

        while self.connection.phase["payload"] != "WaitingForStats":
            log.info(f"Phase : {self.connection.phase["payload"]}")
            await self.connection.poll()

        n = 1
        while n < attemp:
            await asyncio.sleep(10)

            match_data = await self.connection.request("MATCH" , game_id)

            if not match_data["payload"] or match_data["status_code"]== 404:
                print(f'Failed at {n} attemp(s) , try again')
                n += 1
                continue

            if match_data["status_code"] == 200 :
                return match_data["payload"]

            


            






        

        



    





        
    
    












        




                
                
            



    








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
                      
                



