"""
Module Name: api

Description:
    Send the match data to database
Responsibilities:
    - Send the organized match data to database via HTTP request


Author: Steven
Created: 2026-01-17
"""

import requests
from requests import Response 
from lcu import error
from dataclasses import dataclass
import logging

# @dataclass
# class ServerResponse :
#     status_code : int
#     response_msg : Response


logger = logging.getLogger(__name__)

BASE_URL = "http://127.0.0.1:7871/api"



class ClientRequests:
    def __init__(self , payload):
        self.payload : dict = payload
        # Ingestion endpoint on the backend; receives raw events only
        self.base_url : str = BASE_URL

    def post(self , path:str) -> dict:
        try:
            response: Response = requests.post(f'self.base_url+{path}', json=self.payload, timeout=10)
        except requests.RequestException as e:
            raise error.BackendRequestError(
                f"Failed to send POST request to backend endpoint"
            ) from e

        
        try:
            body = response.json()
        except ValueError as e:
            raise error.BackendResponseParseError(
                f"Backend response is not valid JSON (status={response.status_code})"
            ) from e

        
        accepted_code = [201, 202 , 409]
        code = response.status_code

        if code in accepted_code : 
            return body
        
        raise error.BackendReponseCodeError(f'Unexpected code responded , {code}')            
    




    
    
    



    



