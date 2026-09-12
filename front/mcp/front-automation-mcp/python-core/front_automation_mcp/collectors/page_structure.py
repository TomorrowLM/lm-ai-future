from __future__ import annotations

from typing import Any


async def collect_page_structure(session: Any, page: Any, screenshot_path: str | None = None, max_scroll_rounds: int = 20) -> dict[str, Any]:
    """Run the standard evidence collection flow without registering MCP tools."""
    readiness = await session.wait_until_ready(page)
    if not readiness.get("ready"):
        return {"collectionStatus": "blocked-unready", "readiness": readiness}
    scroll = await session.scroll_all(page, max_rounds=max_scroll_rounds)
    snapshot = await session.snapshot(page, screenshot_path)
    navigation = await session.enumerate_navigation(page)
    overlays = await session.collect_overlays(page)
    return {
        "readiness": readiness,
        "pageUrl": snapshot["pageUrl"],
        "route": snapshot["route"],
        "title": snapshot["title"],
        "scroll": scroll,
        "navigation": navigation,
        "dom": {
            "text": snapshot["domText"],
            "candidates": snapshot["domCandidates"],
            "candidateCount": snapshot["candidateCount"],
            "frames": snapshot["frames"],
        },
        "overlays": overlays,
        "screenshotPath": snapshot["screenshotPath"],
    }
