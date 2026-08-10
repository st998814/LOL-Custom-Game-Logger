import os
from dotenv import load_dotenv
from dataclasses import dataclass

load_dotenv(dotenv_path="../.env")

@dataclass
class Configurations:

    TG_BOT_API_TOKEN = os.getenv("TG_BOT_API_TOKEN")
    



configs = Configurations()
















