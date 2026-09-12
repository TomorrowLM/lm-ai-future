from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from ..config import CANDIDATE_EVALUATOR, INTERACTIVE_CANDIDATE_SELECTOR
from .navigation import extract_route_info


def classify_dom_candidate(tag: str, role: str | None, class_name: str | None) -> str:
    tag_name = (tag or "").lower()
    role_name = (role or "").lower()
    classes = (class_name or "").lower()
    if role_name == "menuitem" or "menu-item" in classes or "ivu-menu-item" in classes:
        return "menu"
    if role_name == "tab" or "tab" in classes or "navitem" in classes:
        return "tab"
    if role_name == "switch" or "switch" in classes:
        return "switch"
    if role_name == "button" or tag_name == "button" or "button" in classes or "btn" in classes or "textbtn" in classes:
        return "button"
    if tag_name == "a" or "link" in classes:
        return "link"
    return "unknown"


class SnapshotMixin:
    async def _collect_frame_candidates(self, frame: Any) -> list[dict[str, Any]]:
        locator = frame.locator(INTERACTIVE_CANDIDATE_SELECTOR)
        try:
            candidates = await locator.evaluate_all(CANDIDATE_EVALUATOR, {"frameUrl": frame.url})
        except Exception:
            return []
        counts: dict[tuple[str, str, str, str], int] = {}
        for index, candidate in enumerate(candidates):
            key = (candidate.get("frameUrl", ""), candidate.get("candidateType", "unknown"), candidate.get("text", ""), candidate.get("className", ""))
            occurrence = counts.get(key, 0)
            counts[key] = occurrence + 1
            candidate["index"] = index
            candidate["occurrence"] = occurrence
        return candidates

    async def snapshot(self, page: Any, screenshot_path: str | None = None) -> dict[str, Any]:
        if screenshot_path:
            path = Path(screenshot_path).expanduser().resolve()
            path.parent.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(path), full_page=True)
        dom = await page.locator("body").inner_text(timeout=5000)
        frame_results = []
        all_candidates: list[dict[str, Any]] = []
        for frame_index, frame in enumerate(page.frames):
            try:
                frame_dom = await frame.locator("body").inner_text(timeout=2000)
            except Exception:
                frame_dom = ""
            frame_candidates = await self._collect_frame_candidates(frame)
            for candidate in frame_candidates:
                candidate["frameIndex"] = frame_index
            frame_results.append({"frameIndex": frame_index, "frameUrl": frame.url, "domText": re.sub(r"\s+", " ", frame_dom).strip(), "interactiveCandidates": frame_candidates})
            all_candidates.extend(frame_candidates)
        return {
            "pageUrl": page.url,
            "route": extract_route_info(page.url),
            "title": await page.title(),
            "screenshotPath": screenshot_path,
            "domText": re.sub(r"\s+", " ", dom).strip(),
            "interactiveCandidates": all_candidates,
            "domCandidates": all_candidates,
            "candidateCount": len(all_candidates),
            "frames": frame_results,
        }
