from aiohttp import BasicAuth , ClientSession , ClientError
import asyncio
from dataclasses import dataclass ,field 
import logging
import json

from lcu.api import URLs
import lcu.error as error

log= logging.getLogger(__name__)

@dataclass(frozen = True)
class Credentials:
    port : int 
    token : str 



@dataclass
class LCUResponse:
    status_code : int
    payload  : any





class RequestHandlingException(Exception):
    """Exception raised for single request"""
    def __init__(self, api_name):
        self.message = f'Failed to handle {api_name} request'
        super().__init__(self.message)


    def __str__(self):
        return f'{self.message}'


    
class Session:

    def __init__(self , creds : Credentials , urls : URLs):
        self._cred = creds
        self._urls = urls
        self._auth = BasicAuth("riot", creds.token)


class SideClient :

    def __init__(self, port , token):
        creds = Credentials(port = port , token = token)
        urls = URLs(credentials = creds)
        self._session = Session(creds , urls)
        
        
    def _create_session(self) -> ClientSession:
        session =  ClientSession(base_url = self._session._urls.base , auth = self._session._auth )

        return session 
    
    def get_suffix(self,api_name:str)->str:

        if api_name in self._session._urls.suffix:
            suffix = self._session._urls.suffix[api_name]
            
        else:
            raise ValueError (f'Invalid API name:{api_name}')

        return suffix


    async def request(self , api_name:str , spec = None) -> LCUResponse:

        if not spec:
            suffix = self.get_suffix(api_name)
        else:
            suffix = self.get_suffix(api_name)+f'{spec}'

        try :

            async with self._create_session() as session :
            
                    async with session.get(suffix, ssl=False) as response:

                        status_code =response.status

                        try:
                            payload = await response.json()
                        except json.JSONDecodeError as e:
                            raise error.LCUResponseParseError (
                        f"Failed to parse JSON response from API '{api_name}'"
                                                         ) from e                    

                        return LCUResponse(status_code = status_code , payload = payload )
                    
        except asyncio.TimeoutError as e:
            raise error.LCURequestError(
            f"Request to API '{api_name}' timed out"
        ) from e

        except ClientError as e :
            raise error.LCURequestError(
            f"Request to API '{api_name}' timed out"
        ) from e  




            






        

        



    





        
    
    












        




                
                
            



    








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
                      
                


