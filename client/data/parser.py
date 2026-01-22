"""
Module Name: parser

Description:
    Data filtering and converting from fetched raw data
Responsibilities:
    - Filter data
    - Pack for sending

Author: Steven
Created: 2026-01-17
"""

from dataclasses import dataclass , asdict

from ..agent import DataFetch





@dataclass
class BasicInfo:
    game_id : int 
    game_duration : int
    game_creation_date : str

@dataclass
class Player :
    game_name  = list[str]



    


# 1. filter out the data we want 

# 2. check data capability

class Filter : 
    
    def __init__(self):
        pass



    async def get_raw_data(self)->dict:

        fetch = DataFetch()

        game_id = await fetch.fecth_game_id()

        match_data = await fetch.fetch_match_data(game_id)

        return match_data
    
    async def get_basic_info(self)->BasicInfo:

        data = await self.get_raw_data()

        game_id = data["gameId"]

        game_duration = data["gameDuration"]

        game_creation_date = data["gameCreationDate"]

        return BasicInfo(game_id = game_id , game_duration = game_duration , game_creation_date = game_creation_date)
    

    

        



    




# pack and send

class Packer:
   
    def __init__(self):
        self.filter = Filter()

    async def load_basic_info(self)->dict:

        info =  await self.filter.get_basic_info()

        return asdict(info)


    

async def main():
    pck = Packer()
    basic_info = await pck.load_basic_info()

    print(basic_info)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
    


    










