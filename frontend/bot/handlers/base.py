from abc import ABC , abstractmethod


class BaseOpreator(ABC):

    def __init__(self , update , context):
        self.update = update
        self.context  = context


    @abstractmethod
    async def run(self):
        ...

