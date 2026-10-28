import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from front_automation_mcp.browser.session import BrowserConnection, BrowserSession


class FakePage:
    def __init__(self, url: str, title: str):
        self.url = url
        self._title = title

    async def title(self) -> str:
        return self._title


class BrowserTargetDiagnosticsTests(unittest.IsolatedAsyncioTestCase):
    target_url = "http://localhost:9091/#/safety-inspection/periodic/enterprise-detail?taskId=task-1"

    def make_session(self, contexts):
        session = BrowserSession()
        browser = SimpleNamespace(contexts=contexts)
        session._connections.append(
            BrowserConnection(
                browser_id="chrome-1",
                label="Google Chrome Stable",
                cdp_url="ws://127.0.0.1:9222/devtools/browser/test",
                browser=browser,
                user_data_dir=None,
            )
        )
        return session

    async def test_reports_attached_browser_without_pages_separately(self):
        session = self.make_session([SimpleNamespace(pages=[])])
        with patch("front_automation_mcp.browser.session.default_chrome_user_data_dirs", return_value=[]), patch(
            "front_automation_mcp.browser.session.running_chrome_user_data_dirs", return_value=[]
        ):
            result = await session.connect_browsers(self.target_url)

        diagnostic = result["targetDiagnostic"]
        self.assertEqual(diagnostic["status"], "connected_instances_empty")
        self.assertEqual(diagnostic["checkedPageCount"], 0)
        self.assertEqual(diagnostic["matches"], [])

    async def test_distinguishes_pages_exist_but_full_target_url_does_not_match(self):
        page = FakePage(self.target_url + "&tab=other", "Enterprise detail")
        session = self.make_session([SimpleNamespace(pages=[page])])
        with patch("front_automation_mcp.browser.session.default_chrome_user_data_dirs", return_value=[]), patch(
            "front_automation_mcp.browser.session.running_chrome_user_data_dirs", return_value=[]
        ):
            result = await session.connect_browsers(self.target_url)

        diagnostic = result["targetDiagnostic"]
        self.assertEqual(diagnostic["status"], "url_mismatch")
        self.assertEqual(diagnostic["checkedPageCount"], 1)
        self.assertEqual(diagnostic["skippedInstanceCount"], 0)

    async def test_returns_global_index_for_exact_target_match(self):
        first = FakePage("https://example.test/other", "Other")
        target = FakePage(self.target_url, "Enterprise detail")
        session = self.make_session(
            [SimpleNamespace(pages=[first]), SimpleNamespace(pages=[target])]
        )
        with patch("front_automation_mcp.browser.session.default_chrome_user_data_dirs", return_value=[]), patch(
            "front_automation_mcp.browser.session.running_chrome_user_data_dirs", return_value=[]
        ):
            result = await session.connect_browsers(self.target_url)

        diagnostic = result["targetDiagnostic"]
        self.assertEqual(diagnostic["status"], "matched")
        self.assertEqual(diagnostic["matches"][0]["index"], 1)
        self.assertEqual(diagnostic["matches"][0]["browserId"], "chrome-1")
        self.assertEqual(diagnostic["matches"][0]["title"], "Enterprise detail")

    async def test_marks_duplicate_target_urls_ambiguous_instead_of_choosing_one(self):
        one = FakePage(self.target_url, "Enterprise one")
        two = FakePage(self.target_url, "Enterprise two")
        session = self.make_session([SimpleNamespace(pages=[one, two])])
        with patch("front_automation_mcp.browser.session.default_chrome_user_data_dirs", return_value=[]), patch(
            "front_automation_mcp.browser.session.running_chrome_user_data_dirs", return_value=[]
        ):
            result = await session.connect_browsers(self.target_url)

        diagnostic = result["targetDiagnostic"]
        self.assertEqual(diagnostic["status"], "ambiguous")
        self.assertEqual([match["index"] for match in diagnostic["matches"]], [0, 1])

    async def test_reports_discovery_incomplete_when_a_running_profile_is_skipped(self):
        profile = Path("/tmp/chrome-profile")
        session = BrowserSession()
        with patch(
            "front_automation_mcp.browser.session.default_chrome_user_data_dirs",
            return_value=[profile],
        ), patch(
            "front_automation_mcp.browser.session.running_chrome_user_data_dirs",
            return_value=[profile],
        ), patch(
            "front_automation_mcp.browser.session.read_devtools_active_port",
            side_effect=FileNotFoundError,
        ):
            result = await session.connect_browsers(self.target_url)

        diagnostic = result["targetDiagnostic"]
        self.assertEqual(diagnostic["status"], "no_debuggable_instances")
        self.assertEqual(diagnostic["skippedInstanceCount"], 1)
        self.assertEqual(result["skipped"][0]["reason"], "remote_debugging_not_enabled")

    async def test_keeps_existing_response_contract_when_target_url_is_omitted(self):
        session = self.make_session([SimpleNamespace(pages=[])])
        with patch("front_automation_mcp.browser.session.default_chrome_user_data_dirs", return_value=[]), patch(
            "front_automation_mcp.browser.session.running_chrome_user_data_dirs", return_value=[]
        ):
            result = await session.connect_browsers()

        self.assertNotIn("targetDiagnostic", result)

    async def test_rejects_non_http_target_url(self):
        session = BrowserSession()
        with self.assertRaises(ValueError):
            await session.connect_browsers("javascript:alert(1)")


if __name__ == "__main__":
    unittest.main()