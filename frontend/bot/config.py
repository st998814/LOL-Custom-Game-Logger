import os
from dotenv import load_dotenv
from dataclasses import dataclass

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


@dataclass
class Configurations:

    TG_BOT_API_TOKEN = os.getenv("TG_BOT_API_TOKEN")
    API_BASE_URL = resolve_api_base_url()


configs = Configurations()
