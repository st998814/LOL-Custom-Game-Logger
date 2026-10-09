import os
from dotenv import load_dotenv
from dataclasses import dataclass
from pathlib import Path

load_dotenv()

@dataclass
class Configurations:

    TG_BOT_API_TOKEN = os.getenv("TG_BOT_API_TOKEN")
    API_BASE_URL ="http://127.0.0.1:7871/api/"
    # Snapshots that could not reach the server wait here until the next
    # agent start flushes them (gitignored).
    PENDING_SNAPSHOT_DIR = Path(
        os.getenv(
            "PENDING_SNAPSHOT_DIR",
            Path(__file__).resolve().parent / "data" / "pending",
        )
    )


configs = Configurations()
