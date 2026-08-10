import os
from dotenv import load_dotenv
from dataclasses import dataclass

load_dotenv(dotenv_path="../.env")

@dataclass
class Configurations:

    TG_BOT_API_TOKEN = os.getenv("TG_BOT_API_TOKEN")
    API_BASE_URL ="http://127.0.0.1:7871"


configs = Configurations()
















