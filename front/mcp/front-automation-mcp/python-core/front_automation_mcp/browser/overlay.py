from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from ..config import OVERLAY_CANDIDATE_SELECTOR
from .navigation import extract_route_info
from .interaction import normalize_control_name


def classify_overlay(tag: str, role: str | None, class_name: str | None) -> str | None:
    tag_name = (tag or "").lower()
    role_name = (role or "").lower()
    classes = (class_name or "").lower()
    if tag_name in {"button", "a", "input", "select", "textarea"}:
        return None
    if "drawer" in classes:
        return "drawer"
    if role_name == "dialog" or "dialog" in classes or "modal" in classes or "overlay" in classes or "popover" in classes:
        return "dialog"
    return None


def snapshot_fingerprint(snapshot: dict[str, Any]) -> str:
    """Create a compact fingerprint for detecting same-route view transitions."""
    candidates = []
    for candidate in snapshot.get("interactiveCandidates", []):
        candidates.append(
            (
                candidate.get("candidateType"),
                candidate.get("text"),
                candidate.get("className"),
                candidate.get("route"),
            )
        )
    payload = {
        "domText": snapshot.get("domText", ""),
        "candidates": candidates,
    }
    return hashlib.sha1(
        json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()


def classify_click_transition(
    before_url: str,
    after_url: str,
    overlays: list[dict[str, Any]],
    before_fingerprint: str | None = None,
    after_fingerprint: str | None = None,
) -> dict[str, Any]:
    """Classify a click result so navigation entries are collected as pages."""
    before_route = extract_route_info(before_url)
    after_route = extract_route_info(after_url)
    navigation_occurred = before_route["fullUrl"] != after_route["fullUrl"]
    content_changed = (
        before_fingerprint is not None
        and after_fingerprint is not None
        and before_fingerprint != after_fingerprint
    )
    if overlays:
        transition_type = "overlay"
    elif navigation_occurred or content_changed:
        transition_type = "page"
    else:
        transition_type = "state-change"
    return {
        "type": transition_type,
        "navigationOccurred": navigation_occurred,
        "contentChanged": content_changed,
        "collectionRequired": (navigation_occurred or content_changed) and not overlays,
        "beforeRoute": before_route,
        "afterRoute": after_route,
    }


class OverlayMixin:
    async def close_overlay(self, page: Any) -> dict[str, Any]:
        """Close the currently visible low-risk overlay without submitting business data."""
        before = await self.collect_overlays(page)
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)
        after = await self.collect_overlays(page)
        close_controls = page.locator(
                "[class*='mask' i], [class*='backdrop' i], [data-overlay-mask]"
            )
        if after or await close_controls.count():
            controls = page.locator(
                "[role='dialog'] [aria-label*='close' i], [role='dialog'] [class*='close' i], "
                "[class*='modal'] [class*='close' i], [class*='drawer'] [class*='close' i], "
                "[class*='dialog'] [class*='close' i], [data-overlay] [class*='close' i], "
                "[class*='mask' i], [class*='backdrop' i], [data-overlay-mask]"
            )
            for index in range(await controls.count()):
                control = controls.nth(index)
                if await control.is_visible():
                    await control.click(timeout=5_000)
                    await page.wait_for_timeout(500)
                    break
            after = await self.collect_overlays(page)
        return {"closed": bool(before) and not after, "before": before, "after": after, "pageUrl": page.url}

    async def collect_overlays(self, page: Any) -> list[dict[str, Any]]:
        overlays = page.locator(OVERLAY_CANDIDATE_SELECTOR)
        found = []
        for index in range(await overlays.count()):
            overlay = overlays.nth(index)
            if not await overlay.is_visible():
                continue
            metadata = await overlay.evaluate(
                """element => {
                  const rect = element.getBoundingClientRect();
                  const style = getComputedStyle(element);
                  const tag = element.tagName.toLowerCase();
                  const role = element.getAttribute('role');
                  const className = String(element.className || '');
                  const kind = /drawer/i.test(className) ? 'drawer' : 'dialog';
                  const nestedOverlay = !!element.parentElement?.closest(
                    '[class*="drawer" i], [class*="dialog" i], [class*="modal" i], [class*="overlay" i], [class*="popover" i]'
                  );
                  const title = element.querySelector('[role=heading],h1,h2,h3,[class*=title],[class*=Title],[class*=header]');
                  return {tag, role, className, kind, fixed: style.position === 'fixed' || style.position === 'absolute',
                    nestedOverlay,
                    rect: {x: rect.x, y: rect.y, width: rect.width, height: rect.height},
                    title: (title?.innerText || '').replace(/\\s+/g, ' ').trim(),
                    text: (element.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 1500)};
                }"""
            )
            if metadata.get("nestedOverlay") or re.search(r"mask|backdrop", metadata.get("className", ""), re.I):
                continue
            if classify_overlay(metadata["tag"], metadata.get("role"), metadata.get("className")):
                found.append({"type": metadata["kind"], "name": normalize_control_name(metadata.get("title") or ""), "text": metadata.get("text", ""), "className": metadata.get("className", ""), "route": extract_route_info(page.url), "rect": metadata.get("rect")})
        return found

    async def click_and_collect_overlay(self, page: Any, name: str, occurrence: int = 0) -> dict[str, Any]:
        if occurrence < 0:
            raise ValueError("occurrence must be non-negative")
        before_url = page.url
        before_snapshot = await self.snapshot(page)
        before_fingerprint = snapshot_fingerprint(before_snapshot)
        # Table actions frequently render as span.textBtn with whitespace and no
        # semantic role. Prefer that real action node before generic text lookup.
        control = page.locator(".textBtn").filter(has_text=name)
        if await control.count() == 0:
            control = page.get_by_text(name, exact=True)
        visible_items = []
        for index in range(await control.count()):
            item = control.nth(index)
            if await item.is_visible() and not await item.evaluate("e => !!e.closest('aside,nav,header,[role=navigation]')"):
                visible_items.append(item)
        if occurrence >= len(visible_items):
            raise ValueError(f"visible control '{name}' is unavailable")
        await visible_items[occurrence].evaluate(
            """element => {
              const selector = "button,a,[role=button],[role=tab],[role=menuitem],[class*='navItem'],[class*='tab'],[class*='Tab'],[class*='btn'],[class*='button'],.textBtn,li[class*='menu-item']";
              const target = element.matches(selector) ? element : element.querySelector(selector) || element.closest(selector) || element;
              target.scrollIntoView({block: 'center', inline: 'nearest'});
              target.click();
            }"""
        )
        readiness = await self.wait_until_ready(page)
        overlays = await self.collect_overlays(page)
        after_snapshot = await self.snapshot(page)
        after_fingerprint = snapshot_fingerprint(after_snapshot)
        transition = classify_click_transition(
            before_url,
            page.url,
            overlays,
            before_fingerprint,
            after_fingerprint,
        )
        return {
            "clicked": name,
            "transition": transition,
            "collectionRequired": transition["collectionRequired"],
            "detailCollectionStatus": "ready" if readiness["ready"] else "blocked-unready",
            "readiness": readiness,
            "overlays": overlays,
            "pageUrl": page.url,
            "route": extract_route_info(page.url),
            "beforeViewFingerprint": before_fingerprint,
            "afterViewFingerprint": after_fingerprint,
            "afterSnapshot": after_snapshot,
        }
