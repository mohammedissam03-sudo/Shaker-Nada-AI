
import sqlite3
from pathlib import Path

from contextlib import closing

from datetime import datetime, timedelta, timezone

# Folder containing this Python file
BASE_DIR = Path(__file__).resolve().parent

# Database location
DB_PATH = BASE_DIR / "data" / "conversations.db"


def init_db():

    # Create data folder if needed
    DB_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )


    with closing(sqlite3.connect(DB_PATH)) as conn, conn:

        conn.execute("PRAGMA foreign_keys = ON")

        # Store conversation sessions
        conn.execute("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                gender TEXT NOT NULL
                    CHECK (gender IN ('male', 'female')),
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Store individual chat messages
        conn.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL
                    CHECK (role IN ('user', 'model')),
                content TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,

                FOREIGN KEY (conversation_id)
                    REFERENCES conversations(id)
                    ON DELETE CASCADE
            )
        """)

        conn.commit()


def save_turn(
    conversation_id: str,
    gender: str,
    user_message: str,
    assistant_reply: str
):

    with closing(sqlite3.connect(DB_PATH)) as conn, conn:

        conn.execute("PRAGMA foreign_keys = ON")

        # Check if conversation already exists
        existing = conn.execute(
            "SELECT gender FROM conversations WHERE id = ?",
            (conversation_id,)
        ).fetchone()

        if existing is None:
            conn.execute(
                """
                INSERT INTO conversations (id, gender)
                VALUES (?, ?)
                """,
                (conversation_id, gender)
            )

        elif existing[0] != gender:
            raise ValueError(
                "Conversation persona mismatch"
            )

        # Save user message
        conn.execute(
            """
            INSERT INTO messages
            (conversation_id, role, content)
            VALUES (?, ?, ?)
            """,
            (conversation_id, "user", user_message)
        )

        # Save assistant reply
        conn.execute(
            """
            INSERT INTO messages
            (conversation_id, role, content)
            VALUES (?, ?, ?)
            """,
            (conversation_id, "model", assistant_reply)
        )

        conn.commit()

def get_conversation(conversation_id: str):

    # Connect to SQLite database

    with closing(sqlite3.connect(DB_PATH)) as conn, conn:

        # Find the conversation
        session = conn.execute(
            """
            SELECT gender
            FROM conversations
            WHERE id = ?
            """,
            (conversation_id,)
        ).fetchone()

        # Conversation does not exist
        if session is None:
            return None

        # Retrieve all messages in order
        messages = conn.execute(
            """
            SELECT role, content
            FROM messages
            WHERE conversation_id = ?
            ORDER BY id ASC
            """,
            (conversation_id,)
        ).fetchall()

        # Return conversation data
        return {
            "gender": session[0],
            "history": [
                {
                    "role": role,
                    "content": content
                }
                for role, content in messages
            ]
        }

def cleanup_old_conversations(
    retention_days: int = 30,
    dry_run: bool = True,
    db_path=None
):
    """
    Find or delete inactive conversations.

    dry_run=True: Preview only.
    dry_run=False: Delete expired conversations.
    """

    if type(retention_days) is not int or retention_days < 1:
        raise ValueError(
            "retention_days must be a positive integer"
        )

    database = Path(db_path) if db_path is not None else DB_PATH

    if not database.is_file():
        raise FileNotFoundError(
            f"Database not found: {database}"
        )

    cutoff = (
        datetime.now(timezone.utc)
        - timedelta(days=retention_days)
    ).strftime("%Y-%m-%d %H:%M:%S")


    with closing(sqlite3.connect(database, timeout=10)) as conn, conn:

        # Required for ON DELETE CASCADE
        conn.execute("PRAGMA foreign_keys = ON")

        # Lock writes during real cleanup
        if not dry_run:
            conn.execute("BEGIN IMMEDIATE")

        expired = conn.execute(
            """
            SELECT c.id
            FROM conversations c
            LEFT JOIN messages m
                ON m.conversation_id = c.id
            GROUP BY c.id, c.created_at
            HAVING COALESCE(
                MAX(m.created_at),
                c.created_at
            ) < ?
            """,
            (cutoff,)
        ).fetchall()

        deleted_count = 0

        if not dry_run:
            for (conversation_id,) in expired:
                cursor = conn.execute(
                    """
                    DELETE FROM conversations
                    WHERE id = ?
                    """,
                    (conversation_id,)
                )
                deleted_count += cursor.rowcount

    return {
        "dry_run": dry_run,
        "retention_days": retention_days,
        "cutoff_utc": cutoff,
        "expired_count": len(expired),
        "deleted_count": deleted_count
    }

if __name__ == "__main__":
    init_db()
    print("DATABASE CREATED SUCCESSFULLY")
    print("Location:", DB_PATH)
