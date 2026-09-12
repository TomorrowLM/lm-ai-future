import asyncio
import unittest

from front_automation_mcp.collectors import collect_page_structure


class FakePage:
    pass


class FakeSession:
    def __init__(self) -> None:
        self.calls: list[str] = []

    async def wait_until_ready(self, page):
        self.calls.append("ready")
        return {"ready": True, "stableRounds": 2}

    async def scroll_all(self, page, max_rounds):
        self.calls.append("scroll")
        return {"rounds": max_rounds, "stable": True}

    async def snapshot(self, page, screenshot_path):
        self.calls.append("snapshot")
        return {
            "pageUrl": "https://example.test/#/dashboard?menuId=1",
            "route": {"path": "/dashboard", "fullUrl": "https://example.test/#/dashboard?menuId=1"},
            "title": "Dashboard",
            "domText": "村社数据看板",
            "domCandidates": [{"text": "导出", "candidateType": "button"}],
            "candidateCount": 1,
            "frames": [],
            "screenshotPath": screenshot_path,
        }

    async def enumerate_navigation(self, page):
        self.calls.append("navigation")
        return [{"name": "数据看板", "route": "/dashboard"}]

    async def collect_overlays(self, page):
        self.calls.append("overlays")
        return []


class PageStructureCollectorTests(unittest.TestCase):
    def test_collects_all_evidence_in_a_stable_contract(self) -> None:
        session = FakeSession()
        data = asyncio.run(collect_page_structure(session, FakePage(), "capture.png", 5))

        self.assertEqual(session.calls, ["ready", "scroll", "snapshot", "navigation", "overlays"])
        self.assertEqual(data["readiness"]["ready"], True)
        self.assertEqual(data["route"]["fullUrl"].endswith("menuId=1"), True)
        self.assertEqual(data["dom"]["candidates"][0]["text"], "导出")
        self.assertEqual(data["navigation"][0]["name"], "数据看板")

    def test_unready_page_is_blocked_before_screenshot_or_dom_collection(self) -> None:
        class UnreadySession(FakeSession):
            async def wait_until_ready(self, page):
                self.calls.append("ready")
                return {"ready": False, "reason": "loading-indicators"}

            async def scroll_all(self, page, max_rounds):
                raise AssertionError("scroll must not run while page is unready")

        session = UnreadySession()
        data = asyncio.run(collect_page_structure(session, FakePage(), "capture.png", 5))

        self.assertEqual(data["collectionStatus"], "blocked-unready")
        self.assertEqual(data["readiness"]["ready"], False)
        self.assertEqual(session.calls, ["ready"])


if __name__ == "__main__":
    unittest.main()
