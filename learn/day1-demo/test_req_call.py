import os
import unittest
from unittest.mock import patch

from req_call import build_headers, build_url


class ReqCallTests(unittest.TestCase):
    def test_build_url_uses_default_base_and_chat_path(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(
                build_url(),
                "https://api.openai.com/v1/chat/completions",
            )

    def test_build_headers_requires_api_key(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
                build_headers()


if __name__ == "__main__":
    unittest.main()
