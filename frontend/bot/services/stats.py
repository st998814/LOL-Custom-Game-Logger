from abc import ABC, abstractmethod
from frontend.bot.services.client import HttpClient
from frontend.config import configs
from frontend.bot.services.contracts import BaseContract , UserContract , StatsContract
from frontend.bot.error import UnknownCommandError

base_url = configs.API_BASE_URL


class BaseService(ABC):

    def __init__(self , contract : BaseContract):

        self._client  = HttpClient(base_url)
        self.contract =  contract


    @abstractmethod
    async def handle(self, id : int, command : str):
        ...

    



    

    

class UserService(BaseService):

    def __init__(self):
        super().__init__()
        self.contract = UserContract

    async def handle(self, id , command):
        return 1


    





                
             

        




            







        







        



    








