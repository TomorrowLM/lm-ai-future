from __future__ import annotations

from typing import Any

from ..config import INTERACTIVE_CANDIDATE_SELECTOR
from .interaction import normalize_control_name
from .navigation import extract_route_info
from .overlay import classify_click_transition, snapshot_fingerprint


TEXT_CONTROL_SELECTOR = "input:not([type='hidden']), textarea, [contenteditable='true']"
VISIBLE_CONTROL_SELECTOR = ",".join(
    [
        TEXT_CONTROL_SELECTOR,
        "select",
        "button",
        "a",
        "[role='button']",
        "[role='combobox']",
        "[role='option']",
        "li",
        "[tabindex]",
        "[class*='btn' i]",
        "[class*='button' i]",
        "[class*='deleteBtn' i]",
        "[class*='axisY2' i]",
        "[class*='operation' i]",
        "[class*='action' i]",
        "div",
        "span",
        INTERACTIVE_CANDIDATE_SELECTOR,
    ]
)


def sensitive_summary(value: str) -> dict[str, Any]:
    """Return safe metadata for a value without exposing the value itself."""
    return {"provided": bool(value), "length": len(value), "redacted": True}


def control_matches(metadata: dict[str, Any], name: str) -> bool:
    """Match an AI-provided exact name against visible control metadata."""
    wanted = normalize_control_name(name)
    if not wanted:
        return False
    fields = (
        "text",
        "label",
        "ariaLabel",
        "placeholder",
        "name",
        "id",
        "type",
    )
    return any(normalize_control_name(str(metadata.get(field) or "")) == wanted for field in fields)


def control_priority(metadata: dict[str, Any]) -> int:
    """Prefer the element most likely to own the click among exact text matches."""
    tag = str(metadata.get("tag") or "").lower()
    role = str(metadata.get("role") or "").lower()
    classes = str(metadata.get("className") or "").lower()
    if tag == "button":
        return 100
    if role == "button":
        return 95
    if tag == "a":
        return 90
    if tag == "li":
        return 85
    if metadata.get("hasClickHandler"):
        return 75
    if str(metadata.get("cursor") or "").lower() == "pointer":
        return 65
    if any(token in classes for token in ("operation", "action", "textbtn")):
        return 80
    if any(token in classes for token in ("btn", "button")):
        return 70
    if tag in {"select", "input", "textarea"} or metadata.get("tabIndex") is not None:
        return 60
    if tag in {"div", "span"}:
        return 20
    return 10


def interaction_result(
    *,
    operation: str,
    target: dict[str, Any],
    value: str | None = None,
    sensitive: bool = False,
    **details: Any,
) -> dict[str, Any]:
    """Build a business-agnostic, non-secret interaction result."""
    result: dict[str, Any] = {"operation": operation, "target": target}
    if value is not None:
        result["value"] = sensitive_summary(value) if sensitive else {"provided": True, "redacted": True}
    result.update(details)
    return result


_CONTROL_METADATA_LIST_SCRIPT = """elements => elements.map(element => {
  const normalize = value => (value || '').replace(/\\s+/g, ' ').trim();
  const id = element.getAttribute('id') || '';
  const labels = id ? [...document.querySelectorAll(`label[for="${CSS.escape(id)}"]`)] : [];
  const parentLabel = element.closest('label');
  const text = normalize(element.innerText || element.textContent || '');
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return {
    tag: element.tagName.toLowerCase(),
    text,
    label: normalize(labels.map(label => label.innerText).join(' ') || parentLabel?.innerText || ''),
    ariaLabel: normalize(element.getAttribute('aria-label') || ''),
    placeholder: normalize(element.getAttribute('placeholder') || ''),
    name: normalize(element.getAttribute('name') || ''),
    id: normalize(id),
    type: normalize(element.getAttribute('type') || ''),
    role: normalize(element.getAttribute('role') || ''),
    className: String(element.className || ''),
    tabIndex: element.tabIndex,
    hasClickHandler: typeof element.onclick === 'function' || element.hasAttribute('onclick'),
    cursor: normalize(style.cursor || ''),
    visible: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none',
  };
})"""


async def _visible_controls(page: Any, name: str, selector: str) -> list[dict[str, Any]]:
    matches: list[dict[str, Any]] = []
    for frame_index, frame in enumerate(page.frames):
        controls = frame.locator(selector)
        metadata_list = await controls.evaluate_all(_CONTROL_METADATA_LIST_SCRIPT)
        for index, metadata in enumerate(metadata_list):
            if not metadata.get("visible"):
                continue
            if control_matches(metadata, name):
                matches.append(
                    {
                        "locator": controls.nth(index),
                        "frame": frame,
                        "frameIndex": frame_index,
                        "domIndex": index,
                        "metadata": metadata,
                    }
                )
    matches.sort(key=lambda match: (-control_priority(match["metadata"]), match["frameIndex"], match["domIndex"]))
    return matches


def _target(name: str, occurrence: int, match: dict[str, Any]) -> dict[str, Any]:
    metadata = match["metadata"]
    return {
        "name": normalize_control_name(name),
        "occurrence": occurrence,
        "frameIndex": match["frameIndex"],
        "tag": metadata.get("tag"),
        "role": metadata.get("role"),
        "className": metadata.get("className"),
    }


async def fill_text_control(
    page: Any,
    name: str,
    value: str,
    occurrence: int = 0,
    sensitive: bool = True,
) -> dict[str, Any]:
    if occurrence < 0:
        raise ValueError("occurrence must be non-negative")
    if not isinstance(value, str):
        raise TypeError("value must be a string")
    matches = await _visible_controls(page, name, TEXT_CONTROL_SELECTOR)
    if occurrence >= len(matches):
        raise ValueError(f"visible text control '{normalize_control_name(name)}' occurrence {occurrence} is unavailable")
    match = matches[occurrence]
    await match["locator"].fill(value)
    return interaction_result(
        operation="fill",
        target=_target(name, occurrence, match),
        value=value,
        sensitive=sensitive,
    )


async def click_visible_control(
    page: Any,
    name: str,
    occurrence: int = 0,
    *,
    snapshot: Any,
    wait_until_ready: Any,
    collect_overlays: Any,
) -> dict[str, Any]:
    if occurrence < 0:
        raise ValueError("occurrence must be non-negative")
    before_url = page.url
    before_snapshot = await snapshot(page)
    before_fingerprint = snapshot_fingerprint(before_snapshot)
    matches = await _visible_controls(page, name, VISIBLE_CONTROL_SELECTOR)
    if occurrence >= len(matches):
        raise ValueError(f"visible control '{normalize_control_name(name)}' occurrence {occurrence} is unavailable")
    match = matches[occurrence]
    await match["locator"].scroll_into_view_if_needed()
    await match["locator"].click(timeout=10_000)
    readiness = await wait_until_ready(page)
    overlays = await collect_overlays(page)
    after_snapshot = await snapshot(page)
    after_fingerprint = snapshot_fingerprint(after_snapshot)
    transition = classify_click_transition(
        before_url,
        page.url,
        overlays,
        before_fingerprint,
        after_fingerprint,
    )
    return interaction_result(
        operation="click",
        target=_target(name, occurrence, match),
        transition=transition,
        readiness=readiness,
        overlays=overlays,
        pageUrl=page.url,
        route=extract_route_info(page.url),
        beforeViewFingerprint=before_fingerprint,
        afterViewFingerprint=after_fingerprint,
    )


async def select_visible_option(
    page: Any,
    control_name: str,
    option_name: str,
    occurrence: int = 0,
) -> dict[str, Any]:
    if occurrence < 0:
        raise ValueError("occurrence must be non-negative")
    matches = await _visible_controls(page, control_name, "select, [role='combobox']")
    if occurrence >= len(matches):
        raise ValueError(f"visible select control '{normalize_control_name(control_name)}' occurrence {occurrence} is unavailable")
    match = matches[occurrence]
    locator = match["locator"]
    tag = match["metadata"].get("tag")
    if tag == "select":
        await locator.select_option(label=option_name)
    else:
        await locator.click(timeout=10_000)
        options = match["frame"].locator("[role='option']").filter(has_text=option_name)
        visible_options = [options.nth(index) for index in range(await options.count()) if await options.nth(index).is_visible()]
        if not visible_options:
            raise ValueError(f"visible option '{normalize_control_name(option_name)}' is unavailable")
        await visible_options[0].click(timeout=10_000)
    return interaction_result(
        operation="select",
        target=_target(control_name, occurrence, match),
        option=normalize_control_name(option_name),
    )


class ControlMixin:
    async def fill_text_control(self, page: Any, name: str, value: str, occurrence: int = 0, sensitive: bool = True) -> dict[str, Any]:
        return await fill_text_control(page, name, value, occurrence, sensitive)

    async def click_visible_control(self, page: Any, name: str, occurrence: int = 0) -> dict[str, Any]:
        return await click_visible_control(
            page,
            name,
            occurrence,
            snapshot=self.snapshot,
            wait_until_ready=self.wait_until_ready,
            collect_overlays=self.collect_overlays,
        )

    async def select_visible_option(self, page: Any, control_name: str, option_name: str, occurrence: int = 0) -> dict[str, Any]:
        return await select_visible_option(page, control_name, option_name, occurrence)
