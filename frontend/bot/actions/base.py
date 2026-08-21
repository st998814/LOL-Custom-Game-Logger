from abc import ABC, abstractmethod
from typing import Any
from telegram import Update 
from telegram.ext import ContextTypes


class BaseAction(ABC) : 

   def __init__(self , update , context , message):
  
      self.update: Update = update
      self.context :  ContextTypes.DEFAULT_TYPE = context
      self.message = message


   @abstractmethod
   async def play(self)->Any:
      ...






