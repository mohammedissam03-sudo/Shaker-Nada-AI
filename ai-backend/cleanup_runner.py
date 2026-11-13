
import logging
from datetime import datetime, timezone
from pathlib import Path
from logging.handlers import RotatingFileHandler

from storage import cleanup_old_conversations


# Store logs outside the Git repository
LOG_DIR = Path.home() / "Shaker-Nada-Logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

LOG_FILE = LOG_DIR / "cleanup.log"

logger = logging.getLogger("shaker_nada_cleanup")
logger.setLevel(logging.INFO)

handler = RotatingFileHandler(
    LOG_FILE,
    maxBytes=1024 * 1024,
    backupCount=5,
    encoding="utf-8"
)

handler.setFormatter(
    logging.Formatter("%(levelname)s | %(message)s")
)

logger.addHandler(handler)


def main():
    now = datetime.now(timezone.utc).isoformat()

    print("SHAKER & NADA - DATABASE CLEANUP")
    print("Current UTC:", now)

    try:
        result = cleanup_old_conversations(
            retention_days=30,
            dry_run=True
        )

        logger.info(
            "Time=%s | Mode=DRY_RUN | "
            "Expired=%s | Deleted=%s",
            now,
            result["expired_count"],
            result["deleted_count"]
        )

        print("Expired:", result["expired_count"])
        print("Deleted:", result["deleted_count"])
        print("CLEANUP CHECK COMPLETED")

    except Exception:
        logger.exception("Cleanup check failed at %s", now)
        raise


if __name__ == "__main__":
    main()
