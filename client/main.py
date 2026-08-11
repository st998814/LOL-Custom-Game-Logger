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
import sys
from lcu.credential_resolver import LCUCredential, ProcessInspector 
from lcu.agent import Colloctor, Connection 
from data.parser import Packer, validate_duel_snapshot
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
    RUNNING = auto()
    STOPPING = auto() # minor error occured but worth to retry
    FAILED = auto() # exit with fatal error
    FINISHED = auto() # exit wihout error




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
        
        self.state = AppState.RUNNING

        try:
            data = await self.collect_match_payload()
            payload = self.pack_data(data)
            response = self.send_payload(payload)

        except asyncio.CancelledError:
            self.state = AppState.FAILED
            return

        except error.LCUWorkflowError as e:
            log.error("Failed to collect match snapshot: %s", e)
            self.state = AppState.READY
            return

        except error.InvalidDuelError as e:
            log.warning("Skipping non-duel match snapshot: %s", e)
            self.state = AppState.READY
            return
        
        # for data collecting error
        except (
        error.LCURequestError,
        error.LCUResponseParseError,
        error.InvalidSummonerPayloadError,
        ) as e:
            log.exception("Failed to collect match payload: %s", e)
            self.state = AppState.FAILED
            return
        
        # for server response error
        except (error.BackendRequestError, error.BackendResponseError, error.BackendResponseParseError, error.BackendReponseCodeError) as e : 
            log.exception("Failed to send payload to backend: %s", e)
            self.state = AppState.FAILED
            return
        
        else : 
            log.info("Match payload sent successfully: %s", response)
            self.state = AppState.READY
            

        

    async def build_connection(self):

        log.info("Building Connection...")
        self.conn = Connection(self.port , self.token)
        log.info("Validating connection...")

        await asyncio.sleep(1)

        await self.conn.build_summoner_info()
        
        log.info("LCU connection OK.")
        

    
    async def collect_match_payload(self):

        if self.state != AppState.RUNNING:
            raise error.InvalidStateError(f'The operations could not be executed under {self.state}')

        collector = Colloctor(self.conn)

        gameId = await collector.fecth_game_id()

        data = await collector.get_raw_data(gameId)

        return data
    

    def pack_data(self , data):

        if self.state != AppState.RUNNING:
            raise error.InvalidStateError(f'The operations could not be executed under {self.state}')

        validate_duel_snapshot(data)

        packer = Packer(data)

        payload_to_send = packer.pack()

        payload_to_send["eventType"] = "MATCH_SNAPSHOT"

        return payload_to_send

        

    def send_payload(self , payload):

        if self.state != AppState.RUNNING:
            raise error.InvalidStateError(f'The operations could not be executed under {self.state}')

        req = ClientRequests(payload)

        return req.post()
        




async def main() -> int:
    configure_logging()
    try:
        port, token = LCUCredential(ProcessInspector()).parse()
    except error.CredentialsParsingError as e:
        log.critical("LCU credential discovery failed: %s", e)
        return 1
    
    app = Client(CLIENT_VERSION , port = port , token = token)
    log.info("Welcome to the LCU side-client")

    try : 
        await app.bootstrap(attempts=5)
    except error.BootstrapError as e:
        # just terminate the app
        log.fatal(f'App is terminated , please restart the app : {e}')
        return 1
    
    while app.state != AppState.FINISHED:
        await asyncio.sleep(1)
        log.info("Ready for logging the match..")
        await app.run()

    return 0



if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
