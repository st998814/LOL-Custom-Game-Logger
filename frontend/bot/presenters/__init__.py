from abc import ABC  , abstractmethod


class BasePresenter(ABC) :

    def __init__(self , effective_message):
        self.effective_message = effective_message

    @abstractmethod
    async def present(self)->None:
        ...









       
