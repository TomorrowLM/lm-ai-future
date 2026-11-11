import importlib.util
import os
from pathlib import Path
import unittest
from unittest.mock import patch

from langchain_core.runnables.history import RunnableWithMessageHistory


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCRIPT_PATH = (
    PROJECT_ROOT
    / "study/day5-langchain-chat-model/03-chat-model/chat_history_redis.py"
)


class RedisHistoryConfigTests(unittest.TestCase):
    def test_history_uses_redis_url_from_environment(self) -> None:
        spec = importlib.util.spec_from_file_location(
            "chat_history_redis_config_test", SCRIPT_PATH
        )
        self.assertIsNotNone(spec)
        self.assertIsNotNone(spec.loader)
        module = importlib.util.module_from_spec(spec)

        with (
            patch.dict(
                os.environ,
                {
                    "REDIS_URL": "redis://test-user:test-password@localhost:6379/2"
                },
            ),
            patch.object(RunnableWithMessageHistory, "invoke", return_value=None),
        ):
            spec.loader.exec_module(module)
            history = module.get_message_history("test-session")

        connection_kwargs = history.redis_client.connection_pool.connection_kwargs
        self.assertEqual(connection_kwargs.get("username"), "test-user")
        self.assertEqual(connection_kwargs.get("password"), "test-password")
        self.assertEqual(connection_kwargs.get("db"), 2)
