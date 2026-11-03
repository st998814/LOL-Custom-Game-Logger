import logging

from bot.actions.base import BaseAction
from bot.actions.stats_parse import StatsIntent, parse_stats_arg
from bot.error import HttpRequestError
from bot.presenters.text import TextPresenter
from bot.presenters.text import stats as stats_text
from bot.services.client import CLIENT

logger = logging.getLogger(__name__)


class StatsAction(BaseAction):
    def __init__(self, update, context, message):
        super().__init__(update, context, message)
        self.action_id = 4
        self.client = CLIENT["http"]

    async def play(self) -> None:
        presenter = TextPresenter(self.message)
        args = self.context.args or []
        raw = "/".join(args) if args else ""
        parsed = parse_stats_arg(raw)

        if parsed.intent == StatsIntent.USAGE:
            presenter.text = stats_text.format_usage()
            await presenter.present()
            return

        if parsed.intent == StatsIntent.RETIRED:
            presenter.text = stats_text.format_retired(parsed.retired_command or "")
            await presenter.present()
            return

        if parsed.intent == StatsIntent.INVALID_CHAMPION:
            presenter.text = stats_text.format_invalid_champion()
            await presenter.present()
            return

        user = self.update.effective_user
        if user is None:
            presenter.text = stats_text.format_usage()
            await presenter.present()
            return

        tg_id = str(user.id)
        path, params = self._request_for(parsed, tg_id)

        try:
            payload = await self.client.get(path, params=params)
        except HttpRequestError as error:
            logger.info("Stats request failed: %s (%s)", error.message, error.status)
            if error.status == 404:
                presenter.text = stats_text.format_unlinked()
            else:
                presenter.text = stats_text.format_api_error(error.status, error.message)
            await presenter.present()
            return

        presenter.text = self._format_payload(parsed.intent, payload)
        await presenter.present()

    def _request_for(self, parsed, tg_id: str) -> tuple[str, dict[str, str]]:
        if parsed.intent == StatsIntent.ALL_TIME:
            return "stats", {"tgId": tg_id}
        if parsed.intent == StatsIntent.AVERAGE:
            return "stats/average", {"tgId": tg_id}
        if parsed.intent == StatsIntent.TOPMOST:
            return "stats/topmost", {"tgId": tg_id}
        if parsed.intent == StatsIntent.CHAMPION:
            return "stats/champion", {
                "tgId": tg_id,
                "championId": str(parsed.champion_id),
            }
        if parsed.intent == StatsIntent.DATE:
            return "stats/date", {"tgId": tg_id, "date": parsed.date or ""}
        raise ValueError(f"Unhandled stats intent: {parsed.intent}")

    def _format_payload(self, intent: StatsIntent, payload: dict) -> str:
        if intent == StatsIntent.ALL_TIME:
            return stats_text.format_all_time(payload)
        if intent == StatsIntent.AVERAGE:
            return stats_text.format_average(payload)
        if intent == StatsIntent.TOPMOST:
            return stats_text.format_topmost(payload)
        if intent == StatsIntent.CHAMPION:
            return stats_text.format_champion(payload)
        if intent == StatsIntent.DATE:
            return stats_text.format_date(payload)
        return stats_text.format_usage()
