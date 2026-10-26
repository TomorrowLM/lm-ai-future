import importlib
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

session_module = importlib.import_module("front_automation_mcp.browser.session")
discovery_module = importlib.import_module("front_automation_mcp.browser.discovery")


class ChromeDiscoveryTests(unittest.TestCase):
    def require_helper(self, name: str):
        helper = getattr(discovery_module, name, None)
        self.assertTrue(callable(helper), f"missing browser discovery helper: {name}")
        return helper

    def test_default_user_data_dirs_cover_chrome_and_chromium(self) -> None:
        default_dirs = self.require_helper("default_chrome_user_data_dirs")

        mac_dirs = default_dirs("darwin", Path("/Users/test"), {})
        linux_dirs = default_dirs("linux", Path("/home/test"), {})
        windows_dirs = default_dirs(
            "win32",
            Path("C:/Users/test"),
            {"LOCALAPPDATA": "C:/Users/test/AppData/Local"},
        )

        self.assertIn(
            Path("/Users/test/Library/Application Support/Google/Chrome"),
            mac_dirs,
        )
        self.assertIn(Path("/Users/test/Library/Application Support/Chromium"), mac_dirs)
        self.assertIn(Path("/home/test/.config/google-chrome"), linux_dirs)
        self.assertIn(Path("/home/test/.config/chromium"), linux_dirs)
        self.assertIn(
            Path("C:/Users/test/AppData/Local/Google/Chrome/User Data"),
            windows_dirs,
        )

    def test_extracts_custom_user_data_dir_with_spaces(self) -> None:
        extract = self.require_helper("extract_user_data_dir")
        command_line = (
            '/Applications/Google Chrome --user-data-dir="/tmp/Chrome Profile" '
            "--remote-debugging-port=9222"
        )

        self.assertEqual(extract(command_line), Path("/tmp/Chrome Profile"))

    def test_ignores_non_browser_process_with_chrome_in_data_path(self) -> None:
        discover_dirs = self.require_helper("discover_chrome_user_data_dirs")

        directories = discover_dirs(
            "darwin",
            Path("/Users/test"),
            {},
            ["python --user-data-dir=/tmp/chrome-data"],
        )

        self.assertNotIn(Path("/tmp/chrome-data"), directories)

    def test_discovers_custom_profile_from_chrome_executable_command(self) -> None:
        discover_dirs = self.require_helper("discover_chrome_user_data_dirs")

        directories = discover_dirs(
            "darwin",
            Path("/Users/test"),
            {},
            [
                '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome '
                '--user-data-dir="/tmp/Chrome Profile" --remote-debugging-port=49231'
            ],
        )

        self.assertIn(Path("/tmp/Chrome Profile"), directories)

    def test_running_default_chrome_maps_to_its_user_data_dir(self) -> None:
        running_dirs = self.require_helper("running_chrome_user_data_dirs")

        directories = running_dirs(
            "darwin",
            Path("/Users/test"),
            {},
            ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --restore-last-session"],
        )

        self.assertEqual(
            directories,
            [Path("/Users/test/Library/Application Support/Google/Chrome")],
        )

    def test_running_chrome_channels_map_to_distinct_user_data_dirs(self) -> None:
        running_dirs = self.require_helper("running_chrome_user_data_dirs")
        command_lines = [
            "/Applications/Google Chrome Beta.app/Contents/MacOS/Google Chrome Beta --restore-last-session",
            "/Applications/Google Chrome Dev.app/Contents/MacOS/Google Chrome Dev --restore-last-session",
            "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary --restore-last-session",
        ]

        directories = running_dirs("darwin", Path("/Users/test"), {}, command_lines)

        self.assertEqual(
            directories,
            [
                Path("/Users/test/Library/Application Support/Google/Chrome Beta"),
                Path("/Users/test/Library/Application Support/Google/Chrome Dev"),
                Path("/Users/test/Library/Application Support/Google/Chrome Canary"),
            ],
        )

    def test_windows_chromium_process_maps_to_chromium_user_data_dir(self) -> None:
        running_dirs = self.require_helper("running_chrome_user_data_dirs")
        local_app_data = Path("C:/Users/test/AppData/Local")

        directories = running_dirs(
            "win32",
            Path("C:/Users/test"),
            {"LOCALAPPDATA": str(local_app_data)},
            ['"C:/Program Files/Chromium/Application/chrome.exe" --restore-last-session'],
        )

        self.assertEqual(
            directories,
            [local_app_data / "Chromium" / "User Data"],
        )

    def test_reads_devtools_active_port_as_websocket_endpoint(self) -> None:
        read_endpoint = self.require_helper("read_devtools_active_port")
        with tempfile.TemporaryDirectory() as temporary_dir:
            profile_dir = Path(temporary_dir)
            (profile_dir / "DevToolsActivePort").write_text(
                "49231\n/devtools/browser/test-session\n",
                encoding="utf-8",
            )

            self.assertEqual(
                read_endpoint(profile_dir),
                "ws://127.0.0.1:49231/devtools/browser/test-session",
            )


class BrowserSessionMultiConnectTests(unittest.IsolatedAsyncioTestCase):
    async def test_connects_to_all_discovered_profiles_and_indexes_tabs(self) -> None:
        session = session_module.BrowserSession()
        connect_browsers = getattr(session, "connect_browsers", None)
        self.assertTrue(callable(connect_browsers), "multi-browser connection is missing")

        first_page = SimpleNamespace(url="http://first.test", title=AsyncMock(return_value="First"))
        second_page = SimpleNamespace(url="http://second.test", title=AsyncMock(return_value="Second"))
        first_browser = SimpleNamespace(contexts=[SimpleNamespace(pages=[first_page])])
        second_browser = SimpleNamespace(contexts=[SimpleNamespace(pages=[second_page])])
        playwright = SimpleNamespace(
            chromium=SimpleNamespace(
                connect_over_cdp=AsyncMock(side_effect=[first_browser, second_browser])
            )
        )
        playwright_manager = SimpleNamespace(start=AsyncMock(return_value=playwright))
        profile_dirs = [Path("/profiles/chrome-one"), Path("/profiles/chrome-two")]
        endpoints = [
            "ws://127.0.0.1:49101/devtools/browser/first",
            "ws://127.0.0.1:49102/devtools/browser/second",
        ]

        with patch.object(
            session_module,
            "default_chrome_user_data_dirs",
            return_value=profile_dirs,
        ), patch.object(
            session_module,
            "running_chrome_user_data_dirs",
            return_value=[],
        ), patch.object(
            session_module,
            "read_devtools_active_port",
            side_effect=endpoints,
        ), patch.object(
            session_module,
            "async_playwright",
            return_value=playwright_manager,
        ):
            result = await connect_browsers()

        self.assertTrue(result["connected"])
        self.assertEqual(result["pages"], 2)
        self.assertEqual(len(result["browsers"]), 2)
        self.assertEqual(await session.pages(), [first_page, second_page])
        self.assertIs(await session.page(1), second_page)
        page_entries = await session.page_entries()
        self.assertEqual(page_entries[1][1:], ("chrome-2", "Google Chrome Stable"))

    async def test_reports_when_no_debuggable_instance_is_found(self) -> None:
        session = session_module.BrowserSession()
        connect_browsers = getattr(session, "connect_browsers", None)
        self.assertTrue(callable(connect_browsers), "multi-browser connection is missing")

        with patch.object(
            session_module,
            "default_chrome_user_data_dirs",
            return_value=[],
        ), patch.object(
            session_module,
            "running_chrome_user_data_dirs",
            return_value=[],
        ):
            result = await connect_browsers()

        self.assertFalse(result["connected"])
        self.assertIn("remote debugging enabled", result["message"])

    async def test_reports_running_browser_without_remote_debugging(self) -> None:
        session = session_module.BrowserSession()
        connect_browsers = getattr(session, "connect_browsers", None)
        self.assertTrue(callable(connect_browsers), "multi-browser connection is missing")
        running_dirs = getattr(session_module, "running_chrome_user_data_dirs", None)
        self.assertTrue(callable(running_dirs), "running browser discovery is missing")
        profile_dir = Path("/Users/test/Library/Application Support/Google/Chrome")

        with patch.object(
            session_module,
            "default_chrome_user_data_dirs",
            return_value=[profile_dir],
        ), patch.object(
            session_module,
            "running_chrome_user_data_dirs",
            return_value=[profile_dir],
        ), patch.object(
            session_module,
            "read_devtools_active_port",
            side_effect=FileNotFoundError,
        ):
            result = await connect_browsers()

        self.assertEqual(
            result["skipped"],
            [
                {
                    "browserLabel": "Google Chrome Stable",
                    "reason": "remote_debugging_not_enabled",
                }
            ],
        )


if __name__ == "__main__":
    unittest.main()