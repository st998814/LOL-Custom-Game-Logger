"""
module Name: main

Description:
    The main entrance of the LCU side-client.

Responsibilities:
        - Orchestre  modules and functions of this side-client 


Author: Steven
Created: 2026-01-17
"""
import asyncio
import logging
from typing import Optional, Tuple

from lcu.credential_resolver import LCUCredential, ProcessInspector 
from lcu.agent import Colloctor, Connection 
from data.parser import Packer
from api import ClientRequests
from utils.logger import configure_logging
from lcu import error

from enum import Enum , auto


log = logging.getLogger(__name__)

CLIENT_VERSION = "0.0.1"

class AppState(Enum):
    CREATED = auto()
    BOOTSTRAPPING = auto()
    READY = auto()
    FAILED = auto()
    FINISHED = auto()




class Client:
 
    def __init__(self , version : str , port , token ):
        self.version  = version
        self.port = port 
        self.token = token
        self.conn = None
        self.state = AppState.CREATED

    async def bootstrap(self , attempts : int):

        self.state = AppState.BOOTSTRAPPING

        for attempt in range(attempts):
            try:

                await self.build_connection()
                self.state = AppState.READY
                log.info("The client has been bootstrapped successfully")
                return
            
            except error.LCURequestError as e:
                last_error = e
                log.warning(f"LCU request failed during bootstrap: {e} , attempts : {attempt}/{attempts}")
                await asyncio.sleep(2)

            except error.InvalidSummonerPayloadError as e:
                last_error = e
                log.warning(f"LCU responded, but summoner payload is invalid: {e}  , attempts : {attempt}/{attempts}")
                await asyncio.sleep(1)
        
        self.state = AppState.FAILED
        raise error.BootstrapError(f'Client failed to bootstrap after {attempts}') from last_error


    async def run(self):
        if self.state != AppState.READY:
            raise error.InvalidStateError(f'The operations could not be executed under {self.state}')
        
        data = await self.collect_match_payload()

        
        




            
            


    async def build_connection(self):

        log.info("Building Connection...")
        self.conn = Connection(self.port , self.token)
        log.info("Validating connection...")

        await asyncio.sleep(1)

        await self.conn.build_summoner_info()
        
        log.info("LCU connection OK.")


    
    async def collect_match_payload(self):

        if self.state != AppState.READY:
            raise error.InvalidStateError(f'The operations could not be executed under {self.state}')

        collector = Colloctor(self.conn)

        gameId = await collector.fecth_game_id()

        data = await collector.get_raw_data(gameId)

        return data
    

    def pack_data(self , data):

        if self.state != AppState.READY:
            raise error.InvalidStateError(f'The operations could not be executed under {self.state}')

        packer = Packer()

        payload_to_send = packer.pack(data)

        payload_to_send["eventType"] = "MATCH_SNAPSHOT"

        return payload_to_send

        

    def send_payload(self , payload):

        if self.state != AppState.READY:
            raise error.InvalidStateError(f'The operations could not be executed under {self.state}')

        req = ClientRequests(payload)

        req.post()
        




async def main():

    try:
        port,token = LCUCredential(ProcessInspector()).parse()
    except  error.CredentialsParsingError as e : 
        log.fatal(f"Failed to parse LCU credentials:{e} , please restart the app")
        return
    
    app = Client(CLIENT_VERSION , port = port , token = token)

    try : 
        await app.bootstrap(attempts=5)
    except error.BootstrapError as e:
        log.fatal(f'Please restart the app : {e}')
        return 
    
    



        

    

#client = Client("CLIENT_VERSION" , *port , *token)
        
        


# async def retry( process :any , exc : Exception ,attempts : int = None , time_sleep : int = 3):
#     if attempts : 
#         for times in range(1,attempts):
#             try :
#                 result =  await process()
#                 return result
#             except exc as e :
#                 await asyncio.sleep(time_sleep)
#                 log.info(f'{e} : times of retry {times}')
#     else:
#         while True :
#             try:
#                 result =  await process()
#                 return result
#             except exc as e:
#                 log.exception(e)
#                 await asyncio.sleep(time_sleep)
        




# async def build_connection( ) -> Optional[Connection]:
#     creds = LCUCredential(ProcessInspector())
#     port, token = await get_session_credentials(creds)

#     log.info("Building Connection...")
#     conn = Connection(port, token)

#     log.info("Validating connection...")
#     await asyncio.sleep(1)
  
#     success = await conn.check_connection()

#     if not success :
#         raise ConnectionBuiltError()

#     log.info("LCU connection OK.")
#     return conn


# async def collect_match_payload(conn: Connection) -> dict:
#     collactor = Colloctor(conn)

#     game_id = await collactor.fecth_game_id()
#     if not game_id:
#         raise RuntimeError("Failed to fetch game id")

#     data = await collactor.get_raw_data(game_id)
#     pck = Packer(data)
#     payload = pck.pack()

#     # Explicitly label this payload type for the ingestion API
#     payload["eventType"] = "MATCH_SNAPSHOT"
#     return payload


# def post_payload(payload: dict) -> dict:
#     req = ClientRequests(payload)
#     return req.post()


# async def main() -> None:
#     configure_logging()
#     log.info("Welcome to the LCU side-client")

#     # conn = await build_connection()

#     conn = await retry(build_connection , ConnectionBuiltError , attempts=10 , time_sleep=3)

#     payload = await collect_match_payload(conn)
#     res = post_payload(payload)
#     log.info("Server response: %s", res)

   

    



   




    

    

                







        
        


        
          
    



  

 








if __name__ == "__main__":
    asyncio.run(main())
