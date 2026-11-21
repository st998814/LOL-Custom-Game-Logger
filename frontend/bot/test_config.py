"""Unit tests for bot API base URL resolution (no Telegram dependency)."""

from __future__ import annotations

import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from bot.config import (  # noqa: E402
    DEFAULT_API_BASE_URL,
    normalize_api_base_url,
    resolve_api_base_url,
)


class ApiBaseUrlConfigTest(unittest.TestCase):
    def test_default_is_local_dev(self):
        self.assertEqual(resolve_api_base_url({}), DEFAULT_API_BASE_URL)
        self.assertEqual(DEFAULT_API_BASE_URL, "http://127.0.0.1:7871/api/")

    def test_compose_override_preserves_trailing_slash(self):
        self.assertEqual(
            resolve_api_base_url({"API_BASE_URL": "http://api:7871/api/"}),
            "http://api:7871/api/",
        )

    def test_override_adds_trailing_slash(self):
        self.assertEqual(
            resolve_api_base_url({"API_BASE_URL": "https://ledger.example/api"}),
            "https://ledger.example/api/",
        )

    def test_normalize_strips_whitespace(self):
        self.assertEqual(
            normalize_api_base_url("  http://api:7871/api  "),
            "http://api:7871/api/",
        )


if __name__ == "__main__":
    unittest.main()
