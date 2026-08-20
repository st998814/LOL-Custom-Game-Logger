from __future__ import annotations
from bot import build_application
import logging
from utlis.logger import configure_logging

configure_logging() 

logger = logging.getLogger(__name__)



def main() -> None:
    logger.info("Application started globally configured.")
    application = build_application()
    application.run_polling()


if __name__ == "__main__":
    main()
