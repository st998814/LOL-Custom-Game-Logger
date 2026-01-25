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


# first fetch , then pack , finally send


# the credential must be held as long as the program is running.

# this one is the key to run the client
from lcu.credential_resolver import LCUCredential , ProcessInspector
#this is dynamic 
from lcu.agent import Connection  , Colloctor
# this one is static



# helper function 
async def get_session_credentials(creds : LCUCredential , revoke : bool = False )->tuple:

    while True:
        for t in range(1,10):
            print(f'{t} attempt(s) to fetch the credentials of this session')

            await asyncio.sleep(1)
            port, token  = creds.parse()

            if not port or not token : 
                print(f'Failed at {t} attemp , try again...')
                continue

            else:
                print(f'Credentials for this session port:{port} , token : {token}') 
                return port ,token 

        if not port or not token :
            refresh = input('Refresh ? (y/n): ').lower().startswith('y')
        
            if not refresh : 
                return None , None
        
            else:
                continue




async def check_connection():
    pass




async def main() -> None:

    print("Welcome to the LCU side-client")

    creds = LCUCredential(ProcessInspector())

    port , token  = await get_session_credentials(creds)

    print(f'Credential Get! Port : {port} , Token : {token} ')

    print("Building Connection....")


    print("Try to Connect to LCU")

    conn = Connection(port,token)

    success = await conn.check_connection()

    if not success:
        print("Some error occured !")
        # TODO : Implement rollback mechanism

    else:
        print("OK! ")

    print("Waiting for the match starts ... ")
    

    collactor = Colloctor(conn)

    game_id = await collactor.fecth_game_id()

    if game_id :

        data = await collactor.get_raw_data(game_id)

    print(data)


    

    

                







        
        


        
          
    



  

 








if __name__ == "__main__":
    asyncio.run(main())
