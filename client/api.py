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

from agent import get_raw_data


class Requests:
    pass




async def send()->None:

    url = "http://127.0.0.1:7871/data"

    raw = await get_raw_data()

    response = requests.post(url, json=raw)

    print(f"Status Code: {response.status_code}")

    print(f'response:{response}')

def get():

    url  = "http://127.0.0.1:7871/name"

    response  = requests.get(url)

    print(f"Status Code: {response.status_code}")

    print(f'response:{response.json()}')


