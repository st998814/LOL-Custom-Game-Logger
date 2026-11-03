"""Unit tests for stats arg parse (no Telegram dependency)."""

from __future__ import annotations

import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))

from stats_parse import StatsIntent, parse_stats_arg  # noqa: E402


class ParseStatsArgTest(unittest.TestCase):
    def test_empty_is_all_time(self):
        self.assertEqual(parse_stats_arg("").intent, StatsIntent.ALL_TIME)
        self.assertEqual(parse_stats_arg("   ").intent, StatsIntent.ALL_TIME)

    def test_keywords_before_date_and_champion(self):
        self.assertEqual(parse_stats_arg("average").intent, StatsIntent.AVERAGE)
        self.assertEqual(parse_stats_arg("AVERAGE").intent, StatsIntent.AVERAGE)
        self.assertEqual(parse_stats_arg("topmost").intent, StatsIntent.TOPMOST)

    def test_retired_keywords(self):
        parsed = parse_stats_arg("recent")
        self.assertEqual(parsed.intent, StatsIntent.RETIRED)
        self.assertEqual(parsed.retired_command, "recent")
        self.assertEqual(parse_stats_arg("details").intent, StatsIntent.RETIRED)

    def test_date_pattern(self):
        parsed = parse_stats_arg("26/03/16")
        self.assertEqual(parsed.intent, StatsIntent.DATE)
        self.assertEqual(parsed.date, "26/03/16")

    def test_invalid_calendar_date_is_not_date_intent(self):
        self.assertEqual(parse_stats_arg("26/13/01").intent, StatsIntent.INVALID_CHAMPION)
        self.assertEqual(parse_stats_arg("26/02/30").intent, StatsIntent.INVALID_CHAMPION)

    def test_numeric_champion(self):
        parsed = parse_stats_arg("54")
        self.assertEqual(parsed.intent, StatsIntent.CHAMPION)
        self.assertEqual(parsed.champion_id, 54)

    def test_champion_name_rejected_locally(self):
        self.assertEqual(parse_stats_arg("Garen").intent, StatsIntent.INVALID_CHAMPION)


if __name__ == "__main__":
    unittest.main()
