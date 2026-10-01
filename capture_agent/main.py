import asyncio
from app import CaptureAgent
from lcu.connector import LcuConnector
from lcu.credential_resolver import LCUCredential , ProcessInspector
from errors import BootstrapError
import logging
from utils.logger import configure_logging
import sys
async def main():
    configure_logging()
    ...
VERSION = "0.0.1"

log = logging.getLogger(__name__)

# async def main() -> int:
#     configure_logging()
#     try:
#         port, token = LCUCredential(ProcessInspector()).parse()
#     except error.CredentialsParsingError as e:
#         log.critical("LCU credential discovery failed: %s", e)
#         return 1
    
#     app = Client(CLIENT_VERSION , port = port , token = token)
#     log.info("Welcome to the LCU side-client")







#     try : 
#         await app.bootstrap(attempts=5)# TODO : include http client init 
#         print(app.state)  
#         print(app.puuid)
#     except error.BootstrapError as e:
#         # just terminate the app
#         log.fatal(f'App is terminated , please restart the app : {e}')
#         return 1

  

#     await app.create_linkage()
    
#     while app.state != AppState.FINISHED:
#         await asyncio.sleep(1)
#         log.info("Ready for logging the match..")

#         await app.run()

#     return 0


async def main():
    configure_logging()

    app  = CaptureAgent(version = VERSION, connector=LcuConnector(resolver = LCUCredential(ProcessInspector())))
    # app bootstrap 

    try:
        log.info("App bootstrap starting...") 
        puuid = await app.bootstrap(attempts = 5)
        log.info("App bootstrap successful")
        log.info("App state: %s", app.state)
    # catch the last error after n attempts
    except BootstrapError as e:
        log.critical("App bootstrap failed: %s", e)
        return 1

    await app.run()
    log.info("App run successful")
    log.info("App state: %s", app.state)
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
