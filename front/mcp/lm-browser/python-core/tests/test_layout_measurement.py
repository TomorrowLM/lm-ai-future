import asyncio
import json
import unittest
from types import SimpleNamespace

from playwright.async_api import async_playwright

from front_automation_mcp.browser.snapshot import SnapshotMixin
from front_automation_mcp.tools.collection_tools import register_collection_tools


class FakeFrame:
    def __init__(self, url, result):
        self.url = url
        self.result = result
        self.calls = []

    async def evaluate(self, script, targets):
        self.calls.append((script, targets))
        return self.result


class FakePage:
    def __init__(self, frames, url="https://example.test/#/detail"):
        self.frames = frames
        self.url = url
        self.evaluations = []

    async def evaluate(self, script):
        self.evaluations.append(script)
        return {
            "width": 390,
            "height": 844,
            "devicePixelRatio": 2,
            "visualViewportScale": 1,
            "scrollX": 0,
            "scrollY": 0,
        }


class FakeSession:
    def __init__(self, page, readiness, measurement=None):
        self.page_instance = page
        self.readiness = readiness
        self.measurement = measurement
        self.calls = []

    async def page(self, page_index):
        self.calls.append(("page", page_index))
        return self.page_instance

    async def wait_until_ready(self, page):
        self.calls.append(("ready", page))
        return self.readiness

    async def measure_layout(self, page, targets):
        self.calls.append(("measure", page, targets))
        return self.measurement


class FakeMcp:
    def __init__(self):
        self.tools = {}

    def tool(self):
        def register(function):
            self.tools[function.__name__] = function
            return function

        return register


class LayoutMeasurementTests(unittest.TestCase):
    def test_returns_css_geometry_and_computed_spacing_for_requested_targets(self):
        frame = FakeFrame(
            "https://example.test",
            {
                "viewport": {
                    "width": 390,
                    "height": 844,
                    "devicePixelRatio": 2,
                    "visualViewportScale": 1,
                    "scrollX": 0,
                    "scrollY": 0,
                },
                "targets": [
                    {
                        "id": "card",
                        "status": "measured",
                        "matchCount": 1,
                        "visibleMatchCount": 1,
                        "frameIndex": 0,
                        "frameUrl": "https://example.test",
                        "coordinateSpace": "frame-viewport-css-px",
                        "element": {"tag": "section", "text": "企业信息", "className": "card"},
                        "rect": {"x": 12, "y": 20, "width": 366, "height": 240},
                        "computedStyle": {
                            "boxSizing": "border-box",
                            "margin": {"top": "0px", "right": "12px", "bottom": "0px", "left": "12px"},
                            "padding": {"top": "12px", "right": "12px", "bottom": "12px", "left": "12px"},
                            "rowGap": "8px",
                            "columnGap": "8px",
                        },
                    }
                ],
            },
        )
        page = FakePage([frame])
        targets = [{"id": "card", "text": "企业信息", "tag": "section", "occurrence": 0}]

        result = asyncio.run(SnapshotMixin().measure_layout(page, targets))

        self.assertEqual(result["pageUrl"], page.url)
        self.assertEqual(result["route"]["path"], "/detail")
        self.assertEqual(result["viewport"]["devicePixelRatio"], 2)
        self.assertEqual(result["targets"][0]["rect"]["x"], 12)
        self.assertEqual(result["targets"][0]["computedStyle"]["margin"]["left"], "12px")
        self.assertEqual(frame.calls[0][1]["targets"][0]["id"], "card")
        self.assertEqual(frame.calls[0][1]["targets"][0]["frameIndex"], 0)

    def test_rejects_targets_without_exact_metadata_before_browser_evaluation(self):
        frame = FakeFrame("https://example.test", {})
        page = FakePage([frame])

        with self.assertRaises(ValueError):
            asyncio.run(SnapshotMixin().measure_layout(page, [{"id": "unknown"}]))

        self.assertEqual(frame.calls, [])

    def test_preserves_ambiguous_and_not_visible_match_statuses(self):
        targets = [
            {"id": "duplicate", "status": "ambiguous", "matchCount": 3, "visibleMatchCount": 3},
            {"id": "hidden", "status": "not-visible", "matchCount": 1, "visibleMatchCount": 0},
        ]
        frame = FakeFrame("https://example.test", {"viewport": {}, "targets": targets})
        page = FakePage([frame])

        result = asyncio.run(
            SnapshotMixin().measure_layout(
                page,
                [
                    {"id": "duplicate", "text": "查看"},
                    {"id": "hidden", "text": "编辑"},
                ],
            )
        )

        self.assertEqual([item["status"] for item in result["targets"]], ["ambiguous", "not-visible"])

    def test_registers_a_read_only_measure_layout_tool_and_blocks_unready_pages(self):
        from front_automation_mcp.models import LayoutTarget

        page = FakePage([])
        session = FakeSession(page, {"ready": False, "reason": "loading"})
        mcp = FakeMcp()

        register_collection_tools(mcp, session)
        self.assertIn("measure_layout", mcp.tools)
        result = json.loads(
            asyncio.run(
                mcp.tools["measure_layout"](
                    [LayoutTarget(id="title", text="标题")],
                    4,
                )
            )
        )

        self.assertEqual(result["collectionStatus"], "blocked-unready")
        self.assertEqual(session.calls[0], ("page", 4))
        self.assertEqual(session.calls[1][0], "ready")
        self.assertNotIn("measure", [call[0] for call in session.calls])

    def test_ready_measure_layout_tool_forwards_exact_target_metadata(self):
        from front_automation_mcp.models import LayoutTarget

        page = FakePage([])
        expected_measurement = {"pageUrl": page.url, "targets": []}
        session = FakeSession(page, {"ready": True}, expected_measurement)
        mcp = FakeMcp()
        register_collection_tools(mcp, session)

        result = json.loads(
            asyncio.run(
                mcp.tools["measure_layout"]([LayoutTarget(id="title", text="标题")])
            )
        )

        self.assertEqual(result["pageUrl"], page.url)
        self.assertTrue(result["readiness"]["ready"])
        measure_call = next(call for call in session.calls if call[0] == "measure")
        self.assertEqual(measure_call[2], [{"id": "title", "frameIndex": 0, "text": "标题"}])
        self.assertEqual([call[0] for call in session.calls], ["page", "ready", "measure"])


class BrowserLayoutMeasurementTests(unittest.IsolatedAsyncioTestCase):
    async def test_measures_real_dom_boxes_and_computed_spacing_without_scrolling(self):
        async with async_playwright() as playwright:
            browser = await playwright.chromium.launch(headless=True)
            try:
                page = await browser.new_page(
                    viewport={"width": 390, "height": 300},
                    device_scale_factor=2,
                )
                await page.set_content(
                    """
                    <style>
                      body { margin: 0; }
                      .spacer { height: 800px; }
                      .container {
                        box-sizing: border-box;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        width: 220px;
                        margin: 10px 20px;
                        padding: 12px;
                        border: 2px solid #000;
                      }
                      .title { display: block; margin-left: 4px; }
                      .hidden { display: none; }
                    </style>
                    <div class="spacer"></div>
                    <section class="container" aria-label="record card">
                      <span class="title">Title</span>
                    </section>
                    <div class="duplicate">Duplicate</div>
                    <div class="duplicate">Duplicate</div>
                    <span class="hidden">Hidden item</span>
                    <iframe title="embedded" srcdoc="<div class='frame-target'>Frame target</div>"></iframe>
                    """
                )
                await page.frame_locator("iframe").locator(".frame-target").wait_for()
                await page.evaluate("window.scrollTo(0, 400)")
                scroll_before = await page.evaluate("window.scrollY")

                result = await SnapshotMixin().measure_layout(
                    page,
                    [
                        {
                            "id": "container",
                            "tag": "section",
                            "ariaLabel": "record card",
                        },
                        {
                            "id": "title",
                            "tag": "span",
                            "className": "title",
                            "text": "Title",
                        },
                        {"id": "duplicate", "className": "duplicate", "text": "Duplicate"},
                        {"id": "hidden", "text": "Hidden item"},
                        {
                            "id": "iframe-title",
                            "frameIndex": 1,
                            "tag": "div",
                            "className": "frame-target",
                            "text": "Frame target",
                        },
                    ],
                )

                self.assertEqual(result["viewport"]["devicePixelRatio"], 2)
                self.assertEqual(result["targets"][0]["status"], "measured")
                self.assertFalse(result["targets"][0]["inViewport"])
                self.assertEqual(result["targets"][0]["rect"]["x"], 20)
                self.assertEqual(result["targets"][0]["computedStyle"]["margin"]["left"], "20px")
                self.assertEqual(result["targets"][0]["computedStyle"]["padding"]["left"], "12px")
                self.assertEqual(result["targets"][0]["computedStyle"]["rowGap"], "8px")
                self.assertEqual(result["targets"][1]["rect"]["x"], 38)
                self.assertEqual(result["targets"][2]["status"], "ambiguous")
                self.assertEqual(result["targets"][2]["matchCount"], 2)
                self.assertEqual(result["targets"][3]["status"], "not-visible")
                self.assertEqual(result["targets"][4]["status"], "measured")
                self.assertEqual(result["targets"][4]["frameIndex"], 1)
                self.assertEqual(result["targets"][4]["coordinateSpace"], "frame-viewport-css-px")
                self.assertEqual(await page.evaluate("window.scrollY"), scroll_before)
            finally:
                await browser.close()


class LayoutTargetSchemaTests(unittest.TestCase):
    def test_target_model_uses_camel_case_aliases_and_rejects_unknown_selectors(self):
        from pydantic import ValidationError

        from front_automation_mcp.models.layout import LayoutTarget

        target = LayoutTarget(
            id="title",
            text="Title",
            tag="span",
            frameIndex=1,
            occurrence=0,
        )

        self.assertEqual(target.model_dump(by_alias=True, exclude_none=True), {
            "id": "title",
            "frameIndex": 1,
            "occurrence": 0,
            "text": "Title",
            "tag": "span",
        })
        with self.assertRaises(ValidationError):
            LayoutTarget(id="unknown")
        with self.assertRaises(ValidationError):
            LayoutTarget(id="title", text="Title", selector=".title")

    def test_fastmcp_schema_describes_closed_target_fields(self):
        from front_automation_mcp.server import create_server

        async def get_measure_schema():
            tools = await create_server().list_tools()
            return next(tool.inputSchema for tool in tools if tool.name == "measure_layout")

        schema = asyncio.run(get_measure_schema())
        target_item_schema = schema["properties"]["targets"]["items"]
        target_schema = schema["$defs"]["LayoutTarget"]

        self.assertEqual(target_item_schema["$ref"], "#/$defs/LayoutTarget")
        self.assertFalse(target_schema.get("additionalProperties", True))
        self.assertIn("text", target_schema["properties"])
        self.assertIn("className", target_schema["properties"])
        self.assertIn("frameIndex", target_schema["properties"])


class FastMcpLayoutDispatchTests(unittest.IsolatedAsyncioTestCase):
    async def test_json_targets_are_validated_and_forwarded_to_measurement(self):
        from mcp.server.fastmcp import FastMCP

        page = FakePage([])
        session = FakeSession(page, {"ready": True}, {"pageUrl": page.url, "targets": []})
        server = FastMCP("layout-measurement-test")
        register_collection_tools(server, session)

        content, structured_result = await server.call_tool(
            "measure_layout",
            {
                "targets": [
                    {
                        "id": "title",
                        "text": "标题",
                        "tag": "span",
                        "frameIndex": 0,
                        "occurrence": 0,
                    }
                ],
                "page_index": 0,
            },
        )

        self.assertTrue(content)
        self.assertIn("result", structured_result)
        payload = json.loads(structured_result["result"])
        self.assertEqual(payload["pageUrl"], page.url)
        measure_call = next(call for call in session.calls if call[0] == "measure")
        self.assertEqual(
            measure_call[2],
            [{"id": "title", "frameIndex": 0, "occurrence": 0, "text": "标题", "tag": "span"}],
        )


if __name__ == "__main__":
    unittest.main()