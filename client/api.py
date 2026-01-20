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

import parser

url = "http://127.0.0.1:7871/data"

raw = parser.get_raw()

response = requests.post(url, json=raw)

print(f"Status Code: {response.status_code}")

print(f'response:{response}')
