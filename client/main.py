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



from data.parser import Packer
from lcu.agent import DataFetch




async def main():
        
        fetch = DataFetch()
        data = await fetch.get_raw_data()

        pck = Packer(data)

        pck.pack(data)

        print(pck.payload)
    




    



if __name__ == "__main__":
    asyncio.run(main())
