import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import browser
from models import Snapshot
from front_automation_mcp.browser.session import BrowserSession


class ResolveNavigationUrlTests(unittest.TestCase):
    def test_expands_hash_route_against_current_origin_and_base_path(self) -> None:
        current = "https://gov-test.17an.com/szt/#/org-manage/org-member"

        self.assertTrue(hasattr(browser, "resolve_navigation_url"))
        self.assertEqual(
            browser.resolve_navigation_url(current, "/an/home"),
            "https://gov-test.17an.com/szt/#/an/home",
        )

    def test_preserves_an_absolute_url(self) -> None:
        target = "https://gov-test.17an.com/szt/#/an/home?menuId=brief"

        self.assertTrue(hasattr(browser, "resolve_navigation_url"))
        self.assertEqual(browser.resolve_navigation_url("https://example.test/#/old", target), target)


class NormalizeBrowserStartUrlTests(unittest.TestCase):
    def test_defaults_to_a_blank_tab(self) -> None:
        self.assertTrue(hasattr(browser, "normalize_browser_start_url"))
        self.assertEqual(browser.normalize_browser_start_url(""), "about:blank")

    def test_rejects_script_urls(self) -> None:
        self.assertTrue(hasattr(browser, "normalize_browser_start_url"))
        with self.assertRaises(ValueError):
            browser.normalize_browser_start_url("javascript:alert(1)")


class ChromeLaunchArgumentsTests(unittest.TestCase):
    def test_uses_an_isolated_profile_and_cdp_port(self) -> None:
        self.assertTrue(hasattr(browser, "chrome_launch_arguments"))
        self.assertEqual(
            browser.chrome_launch_arguments(9222, "/private/tmp/mcp-profile"),
            [
                "-na",
                "Google Chrome",
                "--args",
                "--remote-debugging-port=9222",
                "--user-data-dir=/private/tmp/mcp-profile",
            ],
        )

    def test_prefers_ipv6_loopback_before_ipv4_for_same_port(self) -> None:
        self.assertEqual(
            browser.cdp_urls_for_port(9222),
            ["http://[::1]:9222", "http://127.0.0.1:9222"],
        )


class LoginBrowserReuseTests(unittest.IsolatedAsyncioTestCase):
    async def test_reuses_existing_cdp_without_launching_chrome(self) -> None:
        session = BrowserSession()
        session._probe_cdp_endpoint = AsyncMock(return_value=True)

        with patch("front_automation_mcp.browser.session.asyncio.create_subprocess_exec") as launch:
            result = await session.launch_login_browser(port=9222)

        self.assertFalse(result["launched"])
        self.assertTrue(result["reused"])
        self.assertEqual(result["browserLabel"], "Chrome-9222")
        launch.assert_not_called()

    async def test_launches_only_when_cdp_is_unreachable(self) -> None:
        session = BrowserSession()
        session._probe_cdp_endpoint = AsyncMock(return_value=False)
        process = AsyncMock()
        process.wait = AsyncMock()

        with patch("front_automation_mcp.browser.session.socket.socket", return_value=MagicMock()), patch(
            "front_automation_mcp.browser.session.asyncio.create_subprocess_exec", return_value=process
        ) as launch:
            result = await session.launch_login_browser(port=9222)

        self.assertTrue(result["launched"])
        self.assertFalse(result["reused"])
        launch.assert_called_once()


class NormalizeControlNameTests(unittest.TestCase):
    def test_collapses_whitespace_for_tab_matching(self) -> None:
        self.assertTrue(hasattr(browser, "normalize_control_name"))
        self.assertEqual(browser.normalize_control_name(" 村社数据\n看板 "), "村社数据 看板")

    def test_custom_tab_group_children_are_included(self) -> None:
        self.assertIn("[class*='tab-group'] > *", browser.TAB_CANDIDATE_SELECTOR)

    def test_active_class_is_detected_without_active_suffix(self) -> None:
        self.assertTrue(browser.has_active_tab_class("active"))
        self.assertTrue(browser.has_active_tab_class("tab selected"))
        self.assertFalse(browser.has_active_tab_class("tab-item"))


class DomCandidateClassificationTests(unittest.TestCase):
    def test_custom_vue_menu_item_is_classified_as_menu(self) -> None:
        self.assertEqual(
            browser.classify_dom_candidate("li", None, "ivu-menu-item menu-用户管理"),
            "menu",
        )

    def test_custom_react_tab_is_classified_as_tab(self) -> None:
        self.assertEqual(
            browser.classify_dom_candidate("div", None, "navItem dashboard-tab active"),
            "tab",
        )

    def test_text_button_is_classified_and_collected_as_button(self) -> None:
        self.assertEqual(browser.classify_dom_candidate("span", None, "textBtn"), "button")
        self.assertIn(".textBtn", browser.INTERACTIVE_CANDIDATE_SELECTOR)

    def test_overlay_classification_accepts_non_standard_overlay(self) -> None:
        self.assertEqual(
            browser.classify_overlay("div", None, "custom-dialog-panel"),
            "dialog",
        )

    def test_candidate_selector_includes_non_semantic_controls(self) -> None:
        selector = browser.INTERACTIVE_CANDIDATE_SELECTOR
        self.assertIn(".ivu-menu-item", selector)
        self.assertIn("[class*='navItem']", selector)
        self.assertIn("[class*='tab']", selector)


class RouteInfoTests(unittest.TestCase):
    def test_extract_route_info_preserves_query_parameters(self) -> None:
        current = "https://gov-test.17an.com/szt/#/an/dashboard?menuId=dashboard-1"
        self.assertEqual(
            browser.extract_route_info(current),
            {
                "path": "/an/dashboard",
                "fullUrl": current,
            },
        )


class ReadinessTests(unittest.TestCase):
    def test_ant_spin_container_is_not_a_loading_indicator(self) -> None:
        from front_automation_mcp.browser.readiness import is_loading_indicator_class

        self.assertFalse(is_loading_indicator_class("ant-spin-nested-loading css-mncuj7"))
        self.assertFalse(is_loading_indicator_class("ant-spin-container"))
        self.assertTrue(is_loading_indicator_class("ant-spin ant-spin-spinning"))

    def test_ready_sample_requires_stable_route_and_no_loading(self) -> None:
        from front_automation_mcp.browser.readiness import is_ready_sample

        self.assertTrue(is_ready_sample({"route": "/dashboard", "loadingIndicators": [], "frameStates": ["complete"], "fingerprint": "same"}))
        self.assertFalse(is_ready_sample({"route": "/dashboard", "loadingIndicators": ["ant-spin"], "frameStates": ["complete"], "fingerprint": "same"}))

    def test_readiness_fingerprint_changes_when_business_text_changes(self) -> None:
        from front_automation_mcp.browser.readiness import readiness_fingerprint

        first = readiness_fingerprint("/dashboard", "ready", 3, ["complete"])
        second = readiness_fingerprint("/dashboard", "loaded", 3, ["complete"])
        self.assertNotEqual(first, second)


class SnapshotEvidenceTests(unittest.TestCase):
    def test_snapshot_accepts_route_frames_and_dom_candidate_aliases(self) -> None:
        snapshot = Snapshot(
            pageUrl="https://example.test/#/dashboard?menuId=1",
            route={"path": "/dashboard", "fullUrl": "https://example.test/#/dashboard?menuId=1"},
            title="Dashboard",
            domCandidates=[{"text": "编辑", "candidateType": "button"}],
            candidateCount=1,
            frames=[{"frameIndex": 0, "frameUrl": "https://example.test/"}],
        )
        self.assertEqual(snapshot.route.path, "/dashboard")
        self.assertEqual(snapshot.candidate_count, 1)
        self.assertEqual(snapshot.dom_candidates[0]["text"], "编辑")


if __name__ == "__main__":
    unittest.main()
