"""
Module Name: LCU client

Description:
    A client that polling LCU status and make request to backend server once desired match metadata received .

Responsibilities:
    - Polling LCU status
    - Get match result
    - Send request to backend for storing match data to the database

Author: Steven
Created: 2026-01-17
"""
import asyncio

from api import send


async def main():

    await send()


if __name__ == "__main__":
    asyncio.run(main())
