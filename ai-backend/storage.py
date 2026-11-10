
import sqlite3
from pathlib import Path

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

    with sqlite3.connect(DB_PATH) as conn:

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
    with sqlite3.connect(DB_PATH) as conn:

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
    with sqlite3.connect(DB_PATH) as conn:

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

if __name__ == "__main__":
    init_db()
    print("DATABASE CREATED SUCCESSFULLY")
    print("Location:", DB_PATH)
