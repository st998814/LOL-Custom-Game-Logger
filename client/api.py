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


@dataclass
class ServerResponse :
    status_code : int
    responsemsg : Response



class ClientRequests:
    def __init__(self , payload)->ServerResponse:
        self.payload : dict = payload
        # Ingestion endpoint on the backend; receives raw events only
        self.url = "http://127.0.0.1:7871/api/events"

    def post(self) -> ServerResponse:
        try:
            response: Response = requests.post(self.url, json=self.payload, timeout=10)
        except requests.RequestException as e:
            raise error.BackendRequestError(
                f"Failed to send POST request to backend endpoint '{self.url}'"
            ) from e

        if response.status_code >= 400:
            raise error.BackendResponseError(
                f"Backend returned unexpected status code {response.status_code}"
            )

        try:
            body = response.json()
        except ValueError as e:
            raise error.BackendResponseParseError(
                f"Backend response is not valid JSON (status={response.status_code})"
            ) from e

        return ServerResponse(
            status_code=response.status_code,
            responsemsg=body,
        )
    




    
    
    



    



