from configs import (
    DEFAULT_API_BASE_URL,
    normalize_api_base_url,
    resolve_agent_api_key,
    resolve_api_base_url,
)


def test_default_api_base_url_is_local_dev():
    assert resolve_api_base_url({}) == DEFAULT_API_BASE_URL
    assert DEFAULT_API_BASE_URL == "http://127.0.0.1:7871/api/"


def test_api_base_url_override_preserves_trailing_slash():
    assert (
        resolve_api_base_url({"API_BASE_URL": "http://api:7871/api/"})
        == "http://api:7871/api/"
    )


def test_api_base_url_override_adds_trailing_slash():
    assert (
        resolve_api_base_url({"API_BASE_URL": "https://ledger.example/api"})
        == "https://ledger.example/api/"
    )


def test_normalize_api_base_url_strips_whitespace():
    assert normalize_api_base_url("  http://api:7871/api  ") == "http://api:7871/api/"


def test_agent_api_key_unset_or_blank_is_none():
    assert resolve_agent_api_key({}) is None
    assert resolve_agent_api_key({"AGENT_API_KEY": ""}) is None
    assert resolve_agent_api_key({"AGENT_API_KEY": "   "}) is None


def test_agent_api_key_reads_non_blank_value():
    assert resolve_agent_api_key({"AGENT_API_KEY": "secret-key"}) == "secret-key"
