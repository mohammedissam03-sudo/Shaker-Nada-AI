
import sqlite3
import tempfile
import unittest
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

import storage


class TestConversationCleanup(unittest.TestCase):

    def test_old_conversations_are_deleted_safely(self):
        with tempfile.TemporaryDirectory() as folder:
            test_db = Path(folder) / "test.db"

            with patch.object(storage, "DB_PATH", test_db):
                storage.init_db()

                storage.save_turn(
                    "old-chat", "male",
                    "Old user message",
                    "Old assistant reply"
                )

                storage.save_turn(
                    "new-chat", "female",
                    "New user message",
                    "New assistant reply"
                )

                with closing(sqlite3.connect(test_db)) as conn, conn:
                    conn.execute("""
                        UPDATE conversations
                        SET created_at = datetime('now', '-45 days')
                        WHERE id = 'old-chat'
                    """)

                    conn.execute("""
                        UPDATE messages
                        SET created_at = datetime('now', '-45 days')
                        WHERE conversation_id = 'old-chat'
                    """)

                preview = storage.cleanup_old_conversations(
                    retention_days=30,
                    dry_run=True
                )

                self.assertEqual(preview["expired_count"], 1)
                self.assertEqual(preview["deleted_count"], 0)

                result = storage.cleanup_old_conversations(
                    retention_days=30,
                    dry_run=False
                )

                self.assertEqual(result["deleted_count"], 1)

                self.assertIsNone(
                    storage.get_conversation("old-chat")
                )

                new_chat = storage.get_conversation("new-chat")
                self.assertIsNotNone(new_chat)
                self.assertEqual(len(new_chat["history"]), 2)

                with closing(sqlite3.connect(test_db)) as conn:
                    old_messages = conn.execute(
                        "SELECT COUNT(*) FROM messages "
                        "WHERE conversation_id = ?",
                        ("old-chat",)
                    ).fetchone()[0]

                self.assertEqual(old_messages, 0)


if __name__ == "__main__":
    unittest.main()
