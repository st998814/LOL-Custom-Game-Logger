from abc import ABC, abstractmethod
from frontend.bot.services.client import HttpClient
from frontend.config import configs

base_url = configs.API_BASE_URL

# domain : command : api_path



class BaseService(ABC):

    def __init__(self):
        self._client  = HttpClient(base_url)
    

    @abstractmethod
    async def handle(self, id : int, subcommand : str):
        ...

    

    

class UserService(BaseService):

    async def handle(self, id , subcommand):

        session = await self._client.get_session()

        if subcommand == "register".lower() : 
            session.post("/")





                
             

        




            







        







        



    








