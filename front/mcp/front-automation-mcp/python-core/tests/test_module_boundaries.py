import importlib
import unittest


class ModuleBoundaryTests(unittest.TestCase):
    def test_browser_capabilities_are_split_by_responsibility(self) -> None:
        navigation = importlib.import_module("front_automation_mcp.browser.navigation")
        interaction = importlib.import_module("front_automation_mcp.browser.interaction")
        overlay = importlib.import_module("front_automation_mcp.browser.overlay")
        scrolling = importlib.import_module("front_automation_mcp.browser.scrolling")
        snapshot = importlib.import_module("front_automation_mcp.browser.snapshot")

        self.assertTrue(callable(navigation.resolve_navigation_url))
        self.assertTrue(callable(navigation.extract_route_info))
        self.assertTrue(callable(interaction.normalize_control_name))
        self.assertTrue(callable(overlay.classify_overlay))
        self.assertTrue(callable(scrolling.scroll_all))
        self.assertTrue(callable(snapshot.classify_dom_candidate))

    def test_legacy_browser_module_reexports_compatible_helpers(self) -> None:
        import browser
        from front_automation_mcp.browser.navigation import resolve_navigation_url

        self.assertIs(browser.resolve_navigation_url, resolve_navigation_url)

    def test_server_entrypoint_is_thin_and_tool_registration_is_separate(self) -> None:
        tools = importlib.import_module("front_automation_mcp.tools")
        server = importlib.import_module("front_automation_mcp.server")

        self.assertTrue(hasattr(tools, "register_browser_tools"))
        self.assertTrue(hasattr(tools, "register_collection_tools"))
        self.assertTrue(hasattr(server, "create_server"))


class ModelBoundaryTests(unittest.TestCase):
    def test_models_are_grouped_by_contract(self) -> None:
        route = importlib.import_module("front_automation_mcp.models.route")
        snapshot = importlib.import_module("front_automation_mcp.models.snapshot")

        self.assertTrue(hasattr(route, "RouteInfo"))
        self.assertTrue(hasattr(snapshot, "Snapshot"))


if __name__ == "__main__":
    unittest.main()
