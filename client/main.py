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

from lcu.credential_resolver import LCUCredential, ProcessInspector ,CredentialsParsingError
from lcu.agent import Colloctor, Connection  , RequestHandlingException
from data.parser import Packer
from api import ClientRequests
from utils.logger import configure_logging



log = logging.getLogger(__name__)

CLIENT_VERSION = "0.0.1"


# helper function 
# async def get_session_credentials(
#     creds: LCUCredential,
# ) -> Tuple[Optional[int], Optional[str]]:
    
#     # while True : 
#     #     try:
#     #         return creds.parse()
#     #     except CredentialsParsingError as e:
#     #         log.exception(f'{e}')
#     #         if not revoke : 
#     #             raise
#     #         else:
#     #             log.info("Retry for parsing creds")
#     #             await asyncio.sleep(3)

#     await retry(creds.parse , CredentialsParsingError ,time_sleep=1)

class ConnectionBuiltError(Exception):
    """Exception raised for building connection via api"""
    def __init__(self, message = "Failed to establish connection to LCU server"):
        self.message =message
        super().__init__(self.message)


    def __str__(self):
        return f'{self.message}'




class Client:
    
    def __init__(self , version : str , port , token ):
        self.version  = version
        self.port = port 
        self.token = token
        self.conn = None

    async def build_connection(self):

        log.info("Building Connection...")
        self.conn = Connection(self.port , self.token)

        log.info("Validating connection...")

        await asyncio.sleep(1)
  
        success = await self.conn.check_connection()

        if not success : 
            raise ConnectionBuiltError()
        
        log.info("LCU connection OK.")

    
    async def collect_match_payload(self):

        collector = Colloctor(self.conn)
        
   




        

    def send_payload(self):
        pass






    

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
        




async def build_connection( ) -> Optional[Connection]:
    creds = LCUCredential(ProcessInspector())
    port, token = await get_session_credentials(creds)

    log.info("Building Connection...")
    conn = Connection(port, token)

    log.info("Validating connection...")
    await asyncio.sleep(1)
  
    success = await conn.check_connection()

    if not success :
        raise ConnectionBuiltError()

    log.info("LCU connection OK.")
    return conn


async def collect_match_payload(conn: Connection) -> dict:
    collactor = Colloctor(conn)

    game_id = await collactor.fecth_game_id()
    if not game_id:
        raise RuntimeError("Failed to fetch game id")

    data = await collactor.get_raw_data(game_id)
    pck = Packer(data)
    payload = pck.pack()

    # Explicitly label this payload type for the ingestion API
    payload["eventType"] = "MATCH_SNAPSHOT"
    return payload


def post_payload(payload: dict) -> dict:
    req = ClientRequests(payload)
    return req.post()


async def main() -> None:
    configure_logging()
    log.info("Welcome to the LCU side-client")

    # conn = await build_connection()

    conn = await retry(build_connection , ConnectionBuiltError , attempts=10 , time_sleep=3)

    payload = await collect_match_payload(conn)
    res = post_payload(payload)
    log.info("Server response: %s", res)

   

    



   




    

    

                







        
        


        
          
    



  

 








if __name__ == "__main__":
    asyncio.run(main())
