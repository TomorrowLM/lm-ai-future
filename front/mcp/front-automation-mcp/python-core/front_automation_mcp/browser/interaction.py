from __future__ import annotations

import json
from typing import Any

TAB_CANDIDATE_SELECTOR = ",".join(
    [
        "[role='tab']",
        ".ant-tabs-tab",
        ".el-tabs__item",
        ".ivu-tabs-tab",
        "[class*='navItem']",
        ".tab-item",
        ".tabs-item",
        "[class*='tab']",
        "[class*='Tab']",
        "[class*='tab-group'] > *",
        "[class*='tabs-group'] > *",
        "[class*='tab-list'] > *",
        "[class*='tabs-nav'] > *",
    ]
)


def normalize_control_name(value: str) -> str:
    return " ".join(value.split()).strip()


def has_active_tab_class(value: str) -> bool:
    return bool({"active", "selected"}.intersection(value.split()))


def _text_finder_script() -> str:
    return """needle => {
      const normalize = value => (value || '').replace(/\\s+/g, ' ').trim();
      return [...document.querySelectorAll('*')]
        .filter(element => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && normalize(element.innerText) === normalize(needle);
        })
        .map(element => ({
          tag: element.tagName.toLowerCase(),
          text: normalize(element.innerText),
          role: element.getAttribute('role'),
          className: element.className || '',
          parentClassName: element.parentElement?.className || '',
          hasClickHandler: typeof element.onclick === 'function',
          candidateType: (element.getAttribute('role') || '').toLowerCase() === 'tab' ? 'tab' : String(element.className || '').toLowerCase().includes('menu-item') ? 'menu' : 'unknown',
          html: element.outerHTML.slice(0, 1000)
        }));
    }"""


async def find_text_elements(page: Any, text: str) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []
    for frame_index, frame in enumerate(page.frames):
        try:
            matches = await frame.evaluate(_text_finder_script(), text)
        except Exception:
            continue
        for match in matches:
            match["frameIndex"] = frame_index
            match["frameUrl"] = frame.url
            results.append(match)
    return results


class InteractionMixin:
    async def find_text_elements(self, page: Any, text: str) -> list[dict[str, Any]]:
        return await find_text_elements(page, text)

    async def switch_tab(self, page: Any, name: str, occurrence: int = 0) -> dict[str, Any]:
        wanted = normalize_control_name(name)
        matches = []
        tabs = page.locator(TAB_CANDIDATE_SELECTOR)
        for index in range(await tabs.count()):
            tab = tabs.nth(index)
            if await tab.is_visible() and normalize_control_name(await tab.inner_text()) == wanted:
                matches.append(tab)
        if not matches:
            text_matches = page.locator(TAB_CANDIDATE_SELECTOR)
            for index in range(await text_matches.count()):
                tab = text_matches.nth(index)
                if not await tab.is_visible() or normalize_control_name(await tab.inner_text()) != wanted:
                    continue
                in_navigation = await tab.evaluate("element => Boolean(element.closest('aside, nav, header, [role=navigation], [class*=sidebar], [class*=sider]'))")
                if not in_navigation:
                    matches.append(tab)
        if not matches:
            await page.wait_for_timeout(1_200)
            tab_selector = json.dumps(TAB_CANDIDATE_SELECTOR)
            tab_fallback_script = """({ name, occurrence }) => {
                  const normalize = value => (value || '').replace(/\\s+/g, ' ').trim();
                  const candidates = [...document.querySelectorAll(__TAB_SELECTOR__)]
                    .filter(element => {
                      const rect = element.getBoundingClientRect();
                      return rect.width > 0 && rect.height > 0 && normalize(element.innerText) === name
                        && !element.closest('aside, nav, header, [role=navigation], [class*=sidebar], [class*=sider]');
                    });
                  const target = candidates[occurrence];
                  if (!target) return false;
                  target.click();
                  return true;
                }""".replace("__TAB_SELECTOR__", tab_selector)
            clicked = await page.evaluate(
                tab_fallback_script,
                {"name": wanted, "occurrence": occurrence},
            )
            if not clicked:
                raise ValueError(f"visible tab '{wanted}' occurrence {occurrence} is unavailable")
            await page.wait_for_timeout(700)
            active = await page.locator(TAB_CANDIDATE_SELECTOR).evaluate_all(
                """(els, name) => els.filter(e => {
                  const r=e.getBoundingClientRect(); const c=String(e.className || '').toLowerCase();
                  return r.width > 0 && r.height > 0 && (c.includes('active') || c.includes('selected'))
                    && (e.innerText || '').replace(/\\s+/g, ' ').trim() === name;
                }).map(e => (e.innerText || '').replace(/\\s+/g, ' ').trim())""",
                wanted,
            )
            return {"switched": True, "tab": wanted, "occurrence": occurrence, "activeTabs": active, "pageUrl": page.url}
        if occurrence < 0 or occurrence >= len(matches):
            raise ValueError(f"visible tab '{wanted}' occurrence {occurrence} is unavailable")
        target = matches[occurrence]
        await target.scroll_into_view_if_needed()
        await target.click(timeout=10_000)
        await page.wait_for_timeout(700)
        active = []
        for index in range(await tabs.count()):
            tab = tabs.nth(index)
            if not await tab.is_visible():
                continue
            selected = await tab.get_attribute("aria-selected")
            classes = await tab.get_attribute("class") or ""
            if selected == "true" or has_active_tab_class(classes) or "-active" in classes:
                active.append(normalize_control_name(await tab.inner_text()))
        return {"switched": True, "tab": wanted, "occurrence": occurrence, "activeTabs": active, "pageUrl": page.url}
