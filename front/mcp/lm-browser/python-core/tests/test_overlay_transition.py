import unittest

from front_automation_mcp.browser.overlay import classify_click_transition


class ClickTransitionTests(unittest.TestCase):
    def test_route_change_is_a_page_transition(self) -> None:
        result = classify_click_transition(
            "https://example.test/#/taxpayer",
            "https://example.test/#/taxpayer/import",
            [],
        )
        self.assertEqual(result["type"], "page")
        self.assertTrue(result["navigationOccurred"])
        self.assertTrue(result["collectionRequired"])

    def test_overlay_is_not_mistaken_for_detail_page(self) -> None:
        result = classify_click_transition(
            "https://example.test/#/taxpayer",
            "https://example.test/#/taxpayer",
            [{"type": "dialog", "name": "导入"}],
        )
        self.assertEqual(result["type"], "overlay")
        self.assertFalse(result["navigationOccurred"])
        self.assertFalse(result["collectionRequired"])

    def test_same_route_without_overlay_is_a_state_change(self) -> None:
        result = classify_click_transition(
            "https://example.test/#/taxpayer",
            "https://example.test/#/taxpayer",
            [],
        )
        self.assertEqual(result["type"], "state-change")
        self.assertFalse(result["navigationOccurred"])
        self.assertFalse(result["collectionRequired"])

    def test_same_route_content_change_is_a_page_transition(self) -> None:
        result = classify_click_transition(
            "https://example.test/#/taxpayer",
            "https://example.test/#/taxpayer",
            [],
            "before-view",
            "after-view",
        )
        self.assertEqual(result["type"], "page")
        self.assertFalse(result["navigationOccurred"])
        self.assertTrue(result["contentChanged"])
        self.assertTrue(result["collectionRequired"])

    def test_overlay_wins_when_overlay_also_changes_content(self) -> None:
        result = classify_click_transition(
            "https://example.test/#/taxpayer",
            "https://example.test/#/taxpayer",
            [{"type": "dialog", "name": "数据导出"}],
            "before-view",
            "after-view",
        )
        self.assertEqual(result["type"], "overlay")
        self.assertTrue(result["contentChanged"])
        self.assertFalse(result["collectionRequired"])


if __name__ == "__main__":
    unittest.main()
