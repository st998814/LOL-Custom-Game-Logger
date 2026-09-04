from typing import Any

def format_linked(response : dict[str, Any])->str:
    
    if "error" in response:
        error_msg = response.get("error")
        return f'Server response error : {error_msg}'
    

    game_name = response.get("gameName")


    return f'Welcome! {game_name}  , you can now access your ledger by command '

    

    

    

    
    
    



