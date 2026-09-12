from __future__ import annotations

import re
from pathlib import Path
from typing import Any, Iterable

from .page_structure import collect_page_structure


def normalize_navigation(items: Iterable[dict[str, Any]]) -> dict[str, Any]:
    """Remove duplicate render candidates without inventing menu hierarchy."""
    source = list(items)
    unique: list[dict[str, Any]] = []
    seen: set[tuple[Any, ...]] = set()
    for item in source:
        key = (
            item.get("name"),
            item.get("tag"),
            item.get("className"),
            item.get("route"),
        )
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return {"items": unique, "duplicatesRemoved": len(source) - len(unique)}


def _safe_name(value: str) -> str:
    return re.sub(r"[^0-9A-Za-z\u4e00-\u9fff._-]+", "_", value).strip("_") or "tab"


async def collect_tab_variants(
    session: Any,
    page: Any,
    route_or_url: str,
    tab_names: list[str],
    screenshot_dir: str | None = None,
    max_scroll_rounds: int = 20,
) -> dict[str, Any]:
    """Collect sibling Tabs from one parent route without external orchestration."""
    if not route_or_url.strip():
        raise ValueError("route_or_url is required")
    if not tab_names:
        raise ValueError("tab_names must not be empty")
    if len(tab_names) > 100:
        raise ValueError("tab_names must contain at most 100 items")

    output_dir = Path(screenshot_dir) if screenshot_dir else None
    results: list[dict[str, Any]] = []
    for index, tab_name in enumerate(tab_names, start=1):
        navigation = await session.navigate(page, route_or_url)
        parent_ready = await session.wait_until_ready(page, max_rounds=30, interval_ms=1000, stable_rounds=3)
        item: dict[str, Any] = {
            "name": tab_name,
            "index": index,
            "parentNavigation": navigation,
            "parentReadiness": parent_ready,
        }
        if not parent_ready.get("ready"):
            item["collectionStatus"] = "blocked-parent-unready"
            results.append(item)
            continue

        item["switch"] = await session.switch_tab(page, tab_name, occurrence=0)
        tab_ready = await session.wait_until_ready(page, max_rounds=30, interval_ms=1000, stable_rounds=3)
        item["tabReadiness"] = tab_ready
        if not tab_ready.get("ready"):
            item["collectionStatus"] = "blocked-tab-unready"
            results.append(item)
            continue

        screenshot_path = None
        if output_dir:
            screenshot_path = str(output_dir / f"{index:02d}-{_safe_name(tab_name)}-collect.png")
        item["structure"] = await collect_page_structure(session, page, screenshot_path, max_scroll_rounds)
        item["collectionStatus"] = "collected" if item["structure"].get("readiness", {}).get("ready") else "blocked-unready"
        results.append(item)

    return {
        "route": route_or_url,
        "tabCount": len(tab_names),
        "tabs": results,
    }
