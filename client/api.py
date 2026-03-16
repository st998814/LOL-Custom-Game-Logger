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


from dataclasses import dataclass ,asdict


@dataclass
class ServerResponse :
    status_code : int
    responsemsg : Response



class ClientRequests:
    def __init__(self , payload)->ServerResponse:
        self.payload : dict = payload
        # Ingestion endpoint on the backend; receives raw events only
        self.url = "http://127.0.0.1:7871/api/events"

    def post(self):
        
        response = requests.post(self.url , json = self.payload)

        return asdict(ServerResponse(status_code =response.status_code , responsemsg = response.json() ))
    



    



