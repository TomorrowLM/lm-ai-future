import asyncio
import unittest


class _FakeLocator:
    def __init__(self, metadata):
        self.metadata = metadata
        self.filled = None
        self.selected = None

    async def count(self):
        return 1

    def nth(self, index):
        return self

    async def is_visible(self):
        return True

    async def evaluate_all(self, _script):
        return [{**self.metadata, "visible": True, "index": 0}]

    async def evaluate(self, _script):
        return self.metadata

    async def fill(self, value):
        self.filled = value

    async def select_option(self, label):
        self.selected = label


class _FakeFrame:
    def __init__(self, locator):
        self.locator_instance = locator
        self.url = "https://example.test"

    def locator(self, _selector):
        return self.locator_instance


class _FakePage:
    def __init__(self, locator):
        self.frames = [_FakeFrame(locator)]


class ControlInteractionContractTests(unittest.TestCase):
    def test_click_candidates_prioritize_semantic_and_item_controls(self) -> None:
        from front_automation_mcp.browser import controls

        self.assertTrue(hasattr(controls, "control_priority"))
        control_priority = controls.control_priority

        button = {"tag": "button", "role": "", "className": "ivu-btn"}
        wrapper = {"tag": "div", "role": "", "className": "login-btn ivu-form-item"}
        list_item = {"tag": "li", "role": "", "className": "org-item"}
        nested_text = {"tag": "span", "role": "", "className": "org-name"}

        self.assertGreater(control_priority(button), control_priority(wrapper))
        self.assertGreater(control_priority(list_item), control_priority(nested_text))

        event_owner = {"tag": "div", "role": "", "className": "extra" , "hasClickHandler": True}
        event_container = {"tag": "div", "role": "", "className": "card-extra", "hasClickHandler": False}
        self.assertGreater(control_priority(event_owner), control_priority(event_container))

    def test_control_name_matching_uses_exact_visible_metadata(self) -> None:
        import front_automation_mcp.browser as browser

        self.assertTrue(hasattr(browser, "control_matches"))
        control_matches = browser.control_matches

        metadata = {
            "label": "手机号",
            "placeholder": "请输入手机号",
            "name": "mobile",
            "text": "",
        }

        self.assertTrue(control_matches(metadata, "手机号"))
        self.assertTrue(control_matches(metadata, "请输入手机号"))
        self.assertFalse(control_matches(metadata, "验证码"))

    def test_sensitive_summary_never_contains_the_original_value(self) -> None:
        import front_automation_mcp.browser as browser

        self.assertTrue(hasattr(browser, "sensitive_summary"))
        sensitive_summary = browser.sensitive_summary

        summary = sensitive_summary("secret123")

        self.assertTrue(summary["redacted"])
        self.assertEqual(summary["length"], 9)
        self.assertNotIn("secret123", str(summary))

    def test_control_result_contract_is_business_agnostic(self) -> None:
        import front_automation_mcp.browser as browser

        self.assertTrue(hasattr(browser, "interaction_result"))
        interaction_result = browser.interaction_result

        result = interaction_result(
            operation="fill",
            target={"name": "手机号", "occurrence": 0, "frameIndex": 0},
            value="secret123",
            sensitive=True,
        )

        self.assertEqual(result["operation"], "fill")
        self.assertEqual(result["target"], {"name": "手机号", "occurrence": 0, "frameIndex": 0})
        self.assertNotIn("secret123", str(result))
        self.assertNotIn("login", str(result).lower())
        self.assertNotIn("organization", str(result).lower())

    def test_fill_targets_the_requested_visible_occurrence(self) -> None:
        from front_automation_mcp.browser.controls import fill_text_control

        locator = _FakeLocator({"label": "手机号", "tag": "input", "className": ""})
        result = asyncio.run(fill_text_control(_FakePage(locator), "手机号", "secret123"))

        self.assertEqual(locator.filled, "secret123")
        self.assertEqual(result["operation"], "fill")
        self.assertNotIn("secret123", str(result))

    def test_select_uses_the_ai_provided_option_text(self) -> None:
        from front_automation_mcp.browser.controls import select_visible_option

        locator = _FakeLocator({"label": "组织", "tag": "select", "className": ""})
        result = asyncio.run(select_visible_option(_FakePage(locator), "组织", "Option A"))

        self.assertEqual(locator.selected, "Option A")
        self.assertEqual(result["operation"], "select")
        self.assertEqual(result["option"], "Option A")


if __name__ == "__main__":
    unittest.main()
