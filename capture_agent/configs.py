import os
from dotenv import load_dotenv
from dataclasses import dataclass
from pathlib import Path

load_dotenv()

DEFAULT_API_BASE_URL = "http://127.0.0.1:7871/api/"


def normalize_api_base_url(url: str) -> str:
    """Ensure trailing slash so aiohttp base_url path joins stay compatible."""
    trimmed = url.strip()
    return trimmed if trimmed.endswith("/") else f"{trimmed}/"


def resolve_api_base_url(environ: dict[str, str] | None = None) -> str:
    source = environ if environ is not None else os.environ
    raw = source.get("API_BASE_URL") or DEFAULT_API_BASE_URL
    return normalize_api_base_url(raw)


def resolve_agent_api_key(environ: dict[str, str] | None = None) -> str | None:
    """Return AGENT_API_KEY when set and non-blank; otherwise None."""
    source = environ if environ is not None else os.environ
    value = (source.get("AGENT_API_KEY") or "").strip()
    return value or None


@dataclass
class Configurations:

    TG_BOT_API_TOKEN = os.getenv("TG_BOT_API_TOKEN")
    API_BASE_URL = resolve_api_base_url()
    AGENT_API_KEY = resolve_agent_api_key()
    # Snapshots that could not reach the server wait here until the next
    # agent start flushes them (gitignored).
    PENDING_SNAPSHOT_DIR = Path(
        os.getenv(
            "PENDING_SNAPSHOT_DIR",
            Path(__file__).resolve().parent / "data" / "pending",
        )
    )


configs = Configurations()
