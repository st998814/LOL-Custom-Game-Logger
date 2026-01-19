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
from aiohttp import BasicAuth
import asyncio
import time
from dataclasses import dataclass


from credential_resolver import ProcessInspector , LCUCredential



# cred = LCUCredential(ProcessInspector())
# port,token = cred.parse()
# auth_header = BasicAuth("riot" , token)


PREFIX = f'https://127.0.0.1:{port}'
REQUEST_URL = {
    "GAME_FLOW":f'{PREFIX}/lol-gameflow/v1/gameflow-phase', # game phases 
    "EOG":f'{PREFIX}/lol-end-of-game/v1/eog-stats-block', 
    "SESSION":f'{PREFIX}/lol-gameflow/v1/session', # on-going game info 
    "MATCH" : f'{PREFIX}/lol-match-history/v1/games/' # match info

}

@dataclass
class Credentials(frozen = True):
    port : int
    token : str

class Client :

    def __init__(self):
        port , token= LCUCredential(ProcessInspector()).parse()
        self._credential = Credentials(port , token)
        # self._auth_header = BasicAuth("riot" , token)

    def _build_auth_header(self,token):

        header = BasicAuth("riot" ,self._credential[token])

        return header
    

        


    def _get_credential(self):
        """
        Get port and token 
        """
        port , token  = self.credential.parse()
        return port , token

    
    def __str__(self):

        port, token = self.get_credential()
        print(f'Client working on port :{port}')

    



    
    async def create_session():
        pass 


# seperated fetches with a single session 
async def fetch(session, url):
    async with session.get(url ,ssl = False) as response:
        print(response.status)
        print(url)
        return await response.json()



async def main():
    async with aiohttp.ClientSession(auth = auth_header) as session:


        while True :

            # checking game phase
            
            await asyncio.sleep(1)
            phase = await fetch(session, REQUEST_URL["GAME_FLOW"])
            print(phase)


            if phase == "InProgress":
                # start fetching game_id 
                
                await asyncio.sleep(1)
                session_data = await fetch(session , REQUEST_URL["SESSION"])
                game_id = session_data["gameData"]['gameId']
                print(game_id)

            # polling till phase == InProgress
            else:
                continue
            match_data = await fetch(session , REQUEST_URL["MATCH"]+f'{game_id}')
            print(match_data)
                      
                
asyncio.run(main())


