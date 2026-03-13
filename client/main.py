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

log = logging.getLogger(__name__)



# helper function 
async def get_session_credentials(
    creds: LCUCredential,
    revoke: bool = False,
) -> Tuple[Optional[int], Optional[str]]:

    while True:
        for t in range(1,10):
            log.info("%s attempt(s) to fetch the credentials of this session", t)

            await asyncio.sleep(1)
            port, token  = creds.parse()

            if not port or not token : 
                log.warning("Failed at %s attempt(s), try again...", t)
                continue

            else:
                log.info("Credentials for this session port:%s , token:%s", port, token)
                return port ,token 

        if not port or not token :
            refresh = input('Refresh ? (y/n): ').lower().startswith('y')
        
            if not refresh : 
                return None , None
        
            else:
                continue




async def build_connection() -> Optional[Connection]:
    creds = LCUCredential(ProcessInspector())
    port, token = await get_session_credentials(creds)
    if not port or not token:
        return None

    log.info("Building Connection...")
    conn = Connection(port, token)

    log.info("Validating connection...")
    await asyncio.sleep(1)

    success = await conn.check_connection()
    if not success:
        log.error("Failed to connect to LCU (check if the client is running).")
        return None

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

    conn = await build_connection()
    if conn is None:
        return

    payload = await collect_match_payload(conn)
    res = post_payload(payload)
    log.info("Server response: %s", res)

   

    



   




    

    

                







        
        


        
          
    



  

 








if __name__ == "__main__":
    asyncio.run(main())
