from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from ..config import CANDIDATE_EVALUATOR, INTERACTIVE_CANDIDATE_SELECTOR
from .navigation import extract_route_info


_LAYOUT_VIEWPORT_EVALUATOR = """() => ({
    width: window.innerWidth,
    height: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
    visualViewportScale: window.visualViewport?.scale || 1,
    scrollX: window.scrollX,
    scrollY: window.scrollY
})"""

_LAYOUT_MEASUREMENT_EVALUATOR = r"""
({targets}) => {
    const normalize = value => (value || '').replace(/\s+/g, ' ').trim();
    const matchesTarget = (element, target) => {
        if (target.tag !== undefined && element.tagName.toLowerCase() !== target.tag.toLowerCase()) return false;
        if (target.role !== undefined && (element.getAttribute('role') || '') !== target.role) return false;
        if (target.className !== undefined && (element.getAttribute('class') || '') !== target.className) return false;
        if (target.ariaLabel !== undefined && (element.getAttribute('aria-label') || '') !== target.ariaLabel) return false;
        if (target.title !== undefined && (element.getAttribute('title') || '') !== target.title) return false;
        if (target.text !== undefined) {
            const text = normalize(element.innerText || element.getAttribute('aria-label') || element.title || '');
            if (text !== normalize(target.text)) return false;
        }
        return true;
    };
    const isVisible = element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const measure = element => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const edges = (top, right, bottom, left) => ({top, right, bottom, left});
        return {
            element: {
                tag: element.tagName.toLowerCase(),
                text: normalize(element.innerText || element.getAttribute('aria-label') || element.title || ''),
                role: element.getAttribute('role'),
                className: element.getAttribute('class') || '',
                ariaLabel: element.getAttribute('aria-label')
            },
            inViewport: rect.right > 0 && rect.bottom > 0 && rect.left < window.innerWidth && rect.top < window.innerHeight,
            rect: {
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                left: rect.left
            },
            computedStyle: {
                display: style.display,
                visibility: style.visibility,
                boxSizing: style.boxSizing,
                margin: edges(style.marginTop, style.marginRight, style.marginBottom, style.marginLeft),
                padding: edges(style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft),
                borderWidth: edges(style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth),
                borderRadius: style.borderRadius,
                rowGap: style.rowGap,
                columnGap: style.columnGap,
                fontSize: style.fontSize,
                lineHeight: style.lineHeight
            }
        };
    };

    const elements = [...document.querySelectorAll('*')];
    return {
        frameUrl: location.href,
        viewport: {
            width: window.innerWidth,
            height: window.innerHeight,
            devicePixelRatio: window.devicePixelRatio || 1,
            visualViewportScale: window.visualViewport?.scale || 1,
            scrollX: window.scrollX,
            scrollY: window.scrollY
        },
        targets: targets.map(target => {
            const matches = elements.filter(element => matchesTarget(element, target));
            const visibleMatches = matches.filter(isVisible);
            const base = {
                id: target.id,
                frameIndex: target.frameIndex,
                frameUrl: location.href,
                matchCount: matches.length,
                visibleMatchCount: visibleMatches.length,
                coordinateSpace: 'frame-viewport-css-px'
            };

            if (visibleMatches.length === 0) {
                return {...base, status: matches.length > 0 ? 'not-visible' : 'not-found'};
            }
            if (target.occurrence === undefined && visibleMatches.length > 1) {
                return {...base, status: 'ambiguous'};
            }
            const occurrence = target.occurrence === undefined ? 0 : target.occurrence;
            if (occurrence >= visibleMatches.length) {
                return {...base, status: 'occurrence-unavailable', occurrence};
            }
            return {...base, status: 'measured', occurrence, ...measure(visibleMatches[occurrence])};
        })
    };
}
"""

_LAYOUT_TARGET_FIELDS = {"text", "tag", "role", "className", "ariaLabel", "title"}
_LAYOUT_TARGET_KEYS = _LAYOUT_TARGET_FIELDS | {"id", "frameIndex", "occurrence"}
_MAX_LAYOUT_TARGETS = 25


def _validate_layout_targets(targets: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not isinstance(targets, list) or not targets:
        raise ValueError("targets must be a non-empty list")
    if len(targets) > _MAX_LAYOUT_TARGETS:
        raise ValueError(f"targets must contain at most {_MAX_LAYOUT_TARGETS} items")

    validated: list[dict[str, Any]] = []
    seen_ids: set[str] = set()
    for index, item in enumerate(targets):
        if not isinstance(item, dict):
            raise TypeError(f"targets[{index}] must be an object")
        unknown_keys = set(item) - _LAYOUT_TARGET_KEYS
        if unknown_keys:
            raise ValueError(f"targets[{index}] contains unsupported fields: {sorted(unknown_keys)}")
        target = dict(item)
        target_id = target.get("id")
        if not isinstance(target_id, str) or not target_id.strip():
            raise ValueError(f"targets[{index}].id must be a non-empty string")
        if target_id in seen_ids:
            raise ValueError(f"target id '{target_id}' must be unique")
        seen_ids.add(target_id)
        if not any(isinstance(target.get(field), str) and target[field].strip() for field in _LAYOUT_TARGET_FIELDS):
            raise ValueError(f"targets[{index}] needs exact text or element metadata")
        for field in _LAYOUT_TARGET_FIELDS:
            if field in target and not isinstance(target[field], str):
                raise TypeError(f"targets[{index}].{field} must be a string")
        for field, default in (("frameIndex", 0), ("occurrence", None)):
            value = target.get(field, default)
            if value is not None and (type(value) is not int or value < 0):
                raise ValueError(f"targets[{index}].{field} must be a non-negative integer")
        target.setdefault("frameIndex", 0)
        validated.append(target)
    return validated


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
    if role_name == "button" or tag_name == "button" or "button" in classes or "btn" in classes or "textbtn" in classes or "deletebtn" in classes or "axisy2" in classes:
        return "button"
    if tag_name == "a" or "link" in classes:
        return "link"
    return "unknown"


class SnapshotMixin:
    async def measure_layout(self, page: Any, targets: list[dict[str, Any]]) -> dict[str, Any]:
        validated_targets = _validate_layout_targets(targets)
        viewport = await page.evaluate(_LAYOUT_VIEWPORT_EVALUATOR)
        frames = list(page.frames)
        targets_by_frame: dict[int, list[dict[str, Any]]] = {}
        for target in validated_targets:
            targets_by_frame.setdefault(target["frameIndex"], []).append(target)

        results: dict[str, dict[str, Any]] = {}
        frame_metadata: dict[int, dict[str, Any]] = {}
        for frame_index, frame_targets in targets_by_frame.items():
            if frame_index >= len(frames):
                for target in frame_targets:
                    results[target["id"]] = {
                        "id": target["id"],
                        "frameIndex": frame_index,
                        "status": "frame-unavailable",
                        "matchCount": 0,
                        "visibleMatchCount": 0,
                    }
                continue

            frame = frames[frame_index]
            frame_result = await frame.evaluate(
                _LAYOUT_MEASUREMENT_EVALUATOR,
                {"targets": frame_targets},
            )
            frame_metadata[frame_index] = {
                "frameUrl": frame_result.get("frameUrl", frame.url),
                "viewport": frame_result.get("viewport"),
            }
            for item in frame_result.get("targets", []):
                results[item["id"]] = item

        return {
            "pageUrl": page.url,
            "route": extract_route_info(page.url),
            "coordinateSpace": "frame-viewport-css-px",
            "viewport": viewport,
            "frames": frame_metadata,
            "targets": [
                results.get(
                    target["id"],
                    {
                        "id": target["id"],
                        "frameIndex": target["frameIndex"],
                        "status": "unmeasured",
                        "matchCount": 0,
                        "visibleMatchCount": 0,
                    },
                )
                for target in validated_targets
            ],
        }

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
