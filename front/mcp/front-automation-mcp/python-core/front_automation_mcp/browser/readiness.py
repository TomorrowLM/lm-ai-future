from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from ..config import INTERACTIVE_CANDIDATE_SELECTOR
from .navigation import extract_route_info


LOADING_SELECTOR = ",".join(
    [
        "[aria-busy='true']",
        "[class~='loading' i]",
        ".ant-spin-spinning",
        ".ant-loading",
        ".el-loading-mask",
        ".ivu-spin",
        "[class*='spinner' i]",
        "[class*='skeleton' i]",
        "[data-loading='true']",
    ]
)


def normalize_ready_text(value: str) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def is_loading_indicator_class(value: str) -> bool:
    classes = set((value or "").lower().split())
    if {"ant-spin-nested-loading", "ant-spin-container"}.intersection(classes):
        return "ant-spin-spinning" in classes
    return bool(
        "ant-spin-spinning" in classes
        or "ant-loading" in classes
        or "el-loading-mask" in classes
        or "ivu-spin" in classes
        or any("spinner" in item or "skeleton" in item for item in classes)
        or "loading" in classes
    )


def readiness_fingerprint(route: str, text: str, candidate_count: int, frame_states: list[str]) -> str:
    payload = {
        "route": route,
        "text": normalize_ready_text(text)[:20_000],
        "candidateCount": candidate_count,
        "frameStates": frame_states,
    }
    return hashlib.sha1(json.dumps(payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()


def is_ready_sample(sample: dict[str, Any]) -> bool:
    return bool(
        sample.get("route")
        and sample.get("readyState", "complete") == "complete"
        and not sample.get("loadingIndicators")
        and all(state == "complete" for state in sample.get("frameStates", []))
        and sample.get("fingerprint")
    )


class ReadinessMixin:
    async def _readiness_sample(self, page: Any, round_number: int) -> dict[str, Any]:
        page_state = await page.evaluate(
            """({loadingSelector, candidateSelector}) => {
              const normalize = value => (value || '').replace(/\\s+/g, ' ').trim();
              const visible = element => {
                const rect = element.getBoundingClientRect();
                const style = getComputedStyle(element);
                return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
              };
              const loadingIndicators = [...document.querySelectorAll(loadingSelector)]
                .filter(element => visible(element) && !['ant-spin-nested-loading', 'ant-spin-container'].some(className => String(element.className || '').split(/\\s+/).includes(className)))
                .slice(0, 30)
                .map(element => ({tag: element.tagName.toLowerCase(), className: String(element.className || ''), text: normalize(element.innerText).slice(0, 120)}));
              const bodyText = normalize(document.body?.innerText || '');
              const candidates = [...document.querySelectorAll(candidateSelector)].filter(visible);
              return {
                readyState: document.readyState,
                bodyText,
                textLength: bodyText.length,
                candidateCount: candidates.length,
                loadingIndicators,
              };
            }""",
            {"loadingSelector": LOADING_SELECTOR, "candidateSelector": INTERACTIVE_CANDIDATE_SELECTOR},
        )
        frame_states: list[str] = []
        frame_details: list[dict[str, Any]] = []
        for index, frame in enumerate(page.frames):
            try:
                state = await frame.evaluate("document.readyState")
            except Exception:
                state = "unavailable"
            frame_states.append(state)
            frame_details.append({"frameIndex": index, "frameUrl": frame.url, "readyState": state})
        route = extract_route_info(page.url)
        fingerprint = readiness_fingerprint(route["fullUrl"], page_state["bodyText"], page_state["candidateCount"], frame_states)
        return {
            "round": round_number,
            "pageUrl": page.url,
            "route": route,
            "readyState": page_state["readyState"],
            "loadingIndicators": page_state["loadingIndicators"],
            "textLength": page_state["textLength"],
            "candidateCount": page_state["candidateCount"],
            "fingerprint": fingerprint,
            "frameStates": frame_states,
            "frames": frame_details,
        }

    async def wait_until_ready(
        self,
        page: Any,
        max_rounds: int = 8,
        interval_ms: int = 500,
        stable_rounds: int = 2,
    ) -> dict[str, Any]:
        if not 1 <= max_rounds <= 30:
            raise ValueError("max_rounds must be between 1 and 30")
        if not 100 <= interval_ms <= 5_000:
            raise ValueError("interval_ms must be between 100 and 5000")
        if not 2 <= stable_rounds <= 5:
            raise ValueError("stable_rounds must be between 2 and 5")

        samples: list[dict[str, Any]] = []
        stable = 0
        previous_fingerprint: str | None = None
        for round_number in range(1, max_rounds + 1):
            sample = await self._readiness_sample(page, round_number)
            samples.append(sample)
            if is_ready_sample(sample) and sample["fingerprint"] == previous_fingerprint:
                stable += 1
            elif is_ready_sample(sample):
                stable = 1
            else:
                stable = 0
            previous_fingerprint = sample["fingerprint"]
            if stable >= stable_rounds:
                return {
                    "ready": True,
                    "reason": "route, DOM fingerprint, candidate count, frames and loading indicators are stable",
                    "stableRounds": stable,
                    "route": sample["route"],
                    "loadingIndicators": sample["loadingIndicators"],
                    "domFingerprint": sample["fingerprint"],
                    "frameStates": sample["frames"],
                    "samples": samples,
                }
            if round_number < max_rounds:
                await page.wait_for_timeout(interval_ms)

        last = samples[-1]
        reason = "loading-indicators" if last["loadingIndicators"] else "DOM or frame state did not stabilize"
        return {
            "ready": False,
            "reason": reason,
            "stableRounds": stable,
            "route": last["route"],
            "loadingIndicators": last["loadingIndicators"],
            "domFingerprint": last["fingerprint"],
            "frameStates": last["frames"],
            "samples": samples,
        }
