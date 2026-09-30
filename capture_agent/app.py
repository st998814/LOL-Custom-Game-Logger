import logging
from enum import Enum , auto
import asyncio
from lcu.connector import LcuConnector , LcuSession
from lcu.error import CredentialsParsingError , InvalidSummonerPayloadError, LCURequestError, LCUResponseParseError
from errors import BootstrapError
log = logging.getLogger(__name__)

CLIENT_VERSION = "0.0.1"

class AppState(Enum):
    CREATED = auto()
    READY = auto()
    RUNNING = auto()
    STOPPING = auto() # minor error occured but worth to retry
    FAILED = auto() # exit with fatal error
    FINISHED = auto() # exit wihout error
    PENDING = auto() # pending for run 





class CaptureAgent:
 
    def __init__(self , version : str , connector : LcuConnector):
        self.version  = version
        self.state = AppState.CREATED
        self._connector = connector
        self._lcu : LcuSession | None = None
    # this is for the "internal(our side-client -> LCUCLient)" checking , must required. 
    
    async def bootstrap(self , attempts : int):


        for attempt in range(1, attempts + 1):
            try:
                self._lcu = await self._connector.connect() # get the reusable connection to the LCU
                log.info("Summoner information: %s", self._lcu.summoner)
                # if all steps are successful , set the state to READY
                self.state = AppState.READY
                log.info("The client has been bootstrapped successfully")
                return 

            except CredentialsParsingError as e :
                last_error = e
                log.warning("LCU credential discovery failed: %s", e)
                await asyncio.sleep(2)
            except InvalidSummonerPayloadError as e:
                last_error = e
                log.warning("Invalid summoner payload: %s", e)
                await asyncio.sleep(2)
            except LCURequestError as e:
                last_error = e
                log.warning("LCU request failed: %s", e)
                await asyncio.sleep(2)
            except LCUResponseParseError as e:
                last_error = e
                log.warning("LCU response parse failed: %s", e)
                await asyncio.sleep(2)
        
        self.state = AppState.FAILED
        raise BootstrapError(f'Client failed to bootstrap after {attempts} attempts') from last_error
    
    # # might have addtional check(s) for externel services of connection 
    # # //
    # # //

    # # run the raw match data collection processes
    # # and choose path to deliver data
    # async def run(self,service : BaseClient = HttpClient()):

    #     # put check(s) here , is the required resource avaliable ? 


    #     self.state = AppState.RUNNING
    #     # if not get http session , what should we do ?
    #     try:
    #         data = await self.collect_match_payload()
    #         payload = self.pack_data(data)
    #         response = service.post("/events",payload)

    #     except asyncio.CancelledError:
    #         self.state = AppState.FAILED
    #         return

    #     except error.LCUWorkflowError as e:
    #         log.error("Failed to collect match snapshot: %s", e)
    #         self.state = AppState.READY
    #         return

    #     except error.InvalidDuelError as e:
    #         log.warning("Skipping non-duel match snapshot: %s", e)
    #         self.state = AppState.READY
    #         return
        
    #     # for data collecting error
    #     except (
    #     error.LCURequestError,
    #     error.LCUResponseParseError,
    #     error.InvalidSummonerPayloadError,
    #     ) as e:
    #         log.exception("Failed to collect match payload: %s", e)
    #         self.state = AppState.FAILED
    #         return
        
    #     # for server response error
    #     except (error.BackendRequestError, error.BackendResponseError, error.BackendResponseParseError, error.BackendReponseCodeError) as e : 
    #         log.exception("Failed to send payload to backend: %s", e)
    #         self.state = AppState.FAILED
    #         return
        
    #     else : 
    #         log.info("Match payload sent successfully: %s", response)
    #         self.state = AppState.READY
            

    
    # async def build_connection(self):

    #     log.info("Building Connection...")
    #     self.conn = Connection(self.port , self.token)
    #     log.info("Validating connection...")

    #     await asyncio.sleep(1)

    #     puuid = await self.conn.build_summoner_info()
        
    #     log.info("LCU connection OK.")

    #     return puuid

    


    # async def create_linkage(self, service = HttpClient()):

    #     try : 
    #         code, body = await service.post("/user/register/link",{"puuid" : self.puuid} )

    #         if code  == 409 : 
    #             return "You have already registered"
    #         print(type(body))
    #         link = body.get("link")
    #     except (error.BackendRequestError, error.BackendResponseError, error.BackendResponseParseError, error.BackendReponseCodeError) as e : 
    #         log.exception("Failed to send payload to backend: %s", e)
    #         self.state = AppState.FAILED
    #         return

    #     return generate_qr_code(link)
    
    
    # async def collect_match_payload(self):

    #     if self.state != AppState.RUNNING:
    #         raise error.InvalidStateError(f'The operations could not be executed under {self.state}')

    #     collector = Colloctor(self.conn)

    #     gameId = await collector.fecth_game_id()

    #     data = await collector.get_raw_data(gameId)

    #     return data
    

    # def pack_data(self , data):

    #     if self.state != AppState.RUNNING:
    #         raise error.InvalidStateError(f'The operations could not be executed under {self.state}')

    #     validate_duel_snapshot(data)

    #     packer = Packer(data)

    #     payload_to_send = packer.pack()

    #     payload_to_send["eventType"] = "MATCH_SNAPSHOT"

    #     return payload_to_send

        