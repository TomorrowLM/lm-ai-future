import asyncio
import unittest

from front_automation_mcp.browser.scrolling import scroll_to_top


class FakePage:
    def __init__(self):
        self.scripts = []

    async def evaluate(self, script):
        self.scripts.append(script)
        return {
            "atTop": True,
            "windowScrollY": 0,
            "containers": 2,
            "resetContainers": 2,
            "remainingScrolledContainers": 0,
        }


class ScrollingTests(unittest.TestCase):
    def test_scroll_to_top_resets_window_and_nested_containers(self):
        page = FakePage()

        result = asyncio.run(scroll_to_top(page))

        self.assertEqual(result["atTop"], True)
        self.assertEqual(result["windowScrollY"], 0)
        self.assertEqual(result["resetContainers"], 2)
        self.assertIn("scrollTo(0, 0)", page.scripts[0])
        self.assertIn("scrollTop = 0", page.scripts[0])


if __name__ == "__main__":
    unittest.main()
