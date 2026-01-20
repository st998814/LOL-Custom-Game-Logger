"""
Module Name: parser

Description:
    Data filtering and converting from fetched raw data
Responsibilities:
    - Filter data
    - Covert data
    - Pack for sending

Author: Steven
Created: 2026-01-17
"""
import json
import aiohttp
import asyncio

from agent import get_raw_data





def get_raw()->json: 
    
    raw = asyncio.run(get_raw_data())

    return raw







