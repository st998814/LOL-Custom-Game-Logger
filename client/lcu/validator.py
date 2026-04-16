
import error 


def valid_payload(payload : dict):
        
    if not isinstance(payload , dict):
        raise error.InvalidSummonerPayloadError('Payload is not a dict')
    
    
        
    

    