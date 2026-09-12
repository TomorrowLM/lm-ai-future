from __future__ import annotations

from typing import Any

from ..collectors import collect_page_structure as collect_structure
from ..collectors import collect_tab_variants as collect_tab_variants_workflow, normalize_navigation
from ..serializers import result


def register_collection_tools(mcp: Any, session: Any) -> None:
    @mcp.tool()
    async def page_snapshot(page_index: int = 0, screenshot_path: str | None = None, max_scroll_rounds: int = 20) -> str:
        """Capture screenshot, route, frame-aware DOM candidates, and lazy-loaded content."""
        page = await session.page(page_index)
        readiness = await session.wait_until_ready(page)
        if not readiness.get("ready"):
            return result({"collectionStatus": "blocked-unready", "readiness": readiness})
        scroll = await session.scroll_all(page, max_rounds=max_scroll_rounds)
        info = await session.snapshot(page, screenshot_path)
        info["scroll"] = scroll
        info["readiness"] = readiness
        return result(info)

    @mcp.tool()
    async def page_screenshot(page_index: int = 0, path: str = "outputs/screenshots/page.png", max_scroll_rounds: int = 20) -> str:
        """Save a full-page screenshot after incremental lazy-content collection."""
        page = await session.page(page_index)
        readiness = await session.wait_until_ready(page)
        if not readiness.get("ready"):
            return result({"collectionStatus": "blocked-unready", "readiness": readiness})
        await session.scroll_all(page, max_rounds=max_scroll_rounds)
        info = await session.snapshot(page, path)
        return result({"screenshotPath": info["screenshotPath"], "url": info["pageUrl"], "route": info["route"], "candidateCount": info["candidateCount"], "readiness": readiness})

    @mcp.tool()
    async def inspect_dom(page_index: int = 0) -> str:
        """Return a compact DOM/accessibility-oriented snapshot for deterministic verification."""
        page = await session.page(page_index)
        readiness = await session.wait_until_ready(page)
        if not readiness.get("ready"):
            return result({"collectionStatus": "blocked-unready", "readiness": readiness})
        info = await session.snapshot(page)
        return result({"url": info["pageUrl"], "route": info["route"], "title": info["title"], "domText": info["domText"], "interactiveCandidates": info["interactiveCandidates"], "domCandidates": info["domCandidates"], "candidateCount": info["candidateCount"], "frames": info["frames"], "readiness": readiness})

    @mcp.tool()
    async def scroll_page(page_index: int = 0, max_scroll_rounds: int = 20) -> str:
        """Scroll the window and nested scroll containers to reveal lazy content."""
        return result(await session.scroll_all(await session.page(page_index), max_rounds=max_scroll_rounds))

    @mcp.tool()
    async def collect_page_structure(page_index: int = 0, screenshot_path: str | None = None, max_scroll_rounds: int = 20) -> str:
        """Run the standard collection pass: incremental scroll, screenshot, DOM/iframe candidates, navigation, and Dialog/Drawer detection."""
        page = await session.page(page_index)
        return result(await collect_structure(session, page, screenshot_path, max_scroll_rounds))

    @mcp.tool()
    async def collect_navigation_tree(page_index: int = 0) -> str:
        """Enumerate visible navigation through MCP and return a deduplicated candidate list."""
        page = await session.page(page_index)
        readiness = await session.wait_until_ready(page)
        if not readiness.get("ready"):
            return result({"collectionStatus": "blocked-unready", "readiness": readiness})
        navigation = await session.enumerate_navigation(page)
        normalized = normalize_navigation(navigation)
        return result({"readiness": readiness, "pageUrl": page.url, "navigation": normalized["items"], "duplicatesRemoved": normalized["duplicatesRemoved"]})

    @mcp.tool()
    async def collect_tab_variants(
        route_or_url: str,
        tab_names: list[str],
        page_index: int = 0,
        screenshot_dir: str | None = None,
        max_scroll_rounds: int = 20,
    ) -> str:
        """Reset to a parent route and collect each named Tab with readiness, screenshot, DOM and overlay evidence."""
        page = await session.page(page_index)
        return result(await collect_tab_variants_workflow(session, page, route_or_url, tab_names, screenshot_dir, max_scroll_rounds))

    @mcp.tool()
    async def validate_view(page_index: int = 0, visual_names: list[str] | None = None) -> str:
        """Compare AI-provided visual names with DOM candidates; this tool never clicks business controls."""
        page = await session.page(page_index)
        readiness = await session.wait_until_ready(page)
        if not readiness.get("ready"):
            return result({"status": "unverified", "reason": "blocked-unready", "readiness": readiness})
        info = await session.snapshot(page)
        dom_names = {item["text"] for item in info["interactiveCandidates"] if item.get("text")}
        expected = visual_names or []
        return result({"status": "verified" if set(expected) <= dom_names else "mismatch", "visualOnly": sorted(set(expected) - dom_names), "domNames": sorted(dom_names), "url": info["pageUrl"], "readiness": readiness})
