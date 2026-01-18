"""
Module Name: Client-side agent

Description:
    A client-side agent that interacts with LCU

Responsibilities:
    - Polling LCU status
    - Make Request to LCU for getting match metadata

Author: Steven
Created: 2026-01-17
"""

import aiohttp
from aiohttp import BasicAuth
import asyncio
import time


from credential_resolver import ProcessInspector , LCUCredential



cred = LCUCredential(ProcessInspector())
port,token = cred.parse()
auth_header = BasicAuth("riot" , token)


PREFIX = f'https://127.0.0.1:{port}'
REQUEST_URL = {
    "GAME_FLOW":f'{PREFIX}/lol-gameflow/v1/gameflow-phase',
    "EOG":f'{PREFIX}/lol-end-of-game/v1/eog-stats-block', 
    "SESSION":f'{PREFIX}/lol-gameflow/v1/session',
    "MATCH" : f'{PREFIX}/lol-match-history/v1/games/'

}





async def fetch(session, url):
    async with session.get(url ,ssl = False) as response:
        print(response.status)
        return await response.json()


# async def main():
#     async with aiohttp.ClientSession(auth = auth_header) as session:
#         while True :
#             await asyncio.sleep(1)
#             async with session.get(f"https://127.0.0.1:{port}/lol-gameflow/v1/gameflow-phase", ssl = False) as resp:
#                 print(resp.status)

#                 if resp.status != "EndOfGame":
#                     print(await resp.text())
#                     continue
#                 else:
#                     print(await resp.text())
#                     break
async def main():
    async with aiohttp.ClientSession(auth = auth_header) as session:

        while True :
            await asyncio.sleep(1)
            phase = await fetch(session, REQUEST_URL["GAME_FLOW"])
            print(phase)

            if phase == "InProgress":
            # try : fetch session 
                await asyncio.sleep(1)
                session_data = await fetch(session , REQUEST_URL["SESSION"])
                game_id = session_data["gameData"]['gameId']

        

            

            
                
asyncio.run(main())


