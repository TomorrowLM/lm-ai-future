import asyncio
import unittest

from front_automation_mcp.collectors.workflows import collect_tab_variants, normalize_navigation


class FakePage:
    url = "https://example.test/#/base"


class FakeSession:
    def __init__(self):
        self.calls = []

    async def navigate(self, page, route):
        self.calls.append(("navigate", route))
        return {"route": {"path": route}}

    async def wait_until_ready(self, page, max_rounds=8, interval_ms=500, stable_rounds=2):
        self.calls.append(("ready", stable_rounds))
        return {"ready": True, "route": {"path": "/ready"}, "stableRounds": stable_rounds}

    async def switch_tab(self, page, name, occurrence=0):
        self.calls.append(("switch", name, occurrence))
        return {"switched": True, "tab": name, "activeTabs": [name], "pageUrl": page.url}

    async def scroll_all(self, page, max_rounds):
        self.calls.append(("scroll", max_rounds))
        return {"rounds": 1, "stable": True}

    async def snapshot(self, page, screenshot_path):
        self.calls.append(("snapshot", screenshot_path))
        return {
            "pageUrl": page.url,
            "route": {"path": "/tab", "fullUrl": page.url},
            "title": "Example",
            "domText": "内容",
            "domCandidates": [],
            "candidateCount": 0,
            "frames": [],
            "screenshotPath": screenshot_path,
        }

    async def enumerate_navigation(self, page):
        return []

    async def collect_overlays(self, page):
        return []


class CollectionWorkflowTests(unittest.TestCase):
    def test_normalize_navigation_deduplicates_same_rendered_candidate(self):
        items = [
            {"name": "服务功能", "tag": "li", "className": "submenu", "route": None},
            {"name": "服务功能", "tag": "li", "className": "submenu", "route": None},
            {"name": "预约办税", "tag": "li", "className": "item", "route": "/reserve"},
        ]
        result = normalize_navigation(items)
        self.assertEqual(result["items"], [items[0], items[2]])
        self.assertEqual(result["duplicatesRemoved"], 1)

    def test_collect_tab_variants_resets_to_parent_route_for_each_tab(self):
        session = FakeSession()
        result = asyncio.run(collect_tab_variants(session, FakePage(), "/base", ["概览", "详情"], max_scroll_rounds=3))
        self.assertEqual([item["name"] for item in result["tabs"]], ["概览", "详情"])
        self.assertEqual(
            [call[0] for call in session.calls if call[0] in {"navigate", "switch"}],
            ["navigate", "switch", "navigate", "switch"],
        )
        self.assertEqual(result["tabs"][0]["structure"]["readiness"]["ready"], True)


if __name__ == "__main__":
    unittest.main()
