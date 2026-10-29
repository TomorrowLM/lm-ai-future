from __future__ import annotations

from typing import Any
from urllib.parse import urlsplit

from ..config import NAVIGATION_CANDIDATE_SELECTOR


def resolve_navigation_url(current_url: str, route_or_url: str) -> str:
    """Expand a SPA hash route using the current application's origin and base path."""
    target = route_or_url.strip()
    if target.startswith(("http://", "https://")):
        return target
    if not target.startswith("/"):
        target = f"/{target.lstrip('#/')}"
    current = urlsplit(current_url)
    return f"{current.scheme}://{current.netloc}{current.path}#{target}"


def extract_route_info(page_url: str) -> dict[str, str]:
    """Return a route while preserving the complete URL and its query string."""
    parsed = urlsplit(page_url)
    fragment = parsed.fragment or ""
    route = fragment.split("?", 1)[0] if fragment else parsed.path
    if route and not route.startswith("/"):
        route = f"/{route}"
    return {"path": route or "/", "fullUrl": page_url}


class NavigationMixin:
    async def navigate(self, page: Any, route_or_url: str) -> dict[str, Any]:
        target_url = resolve_navigation_url(page.url, route_or_url)
        current = urlsplit(page.url)
        target = urlsplit(target_url)
        if (target.scheme, target.netloc) != (current.scheme, current.netloc):
            raise ValueError("navigation target must have the same origin as the active page")
        await page.goto(target_url, wait_until="domcontentloaded", timeout=30_000)
        await page.wait_for_timeout(500)
        return {"navigated": True, "pageUrl": page.url, "route": extract_route_info(page.url), "title": await page.title()}

    async def enumerate_navigation(self, page: Any) -> list[dict[str, Any]]:
        """Enumerate visible framework menu items before any page-specific collection."""
        return await page.locator(NAVIGATION_CANDIDATE_SELECTOR).evaluate_all(
            """els => {
              const normalize = value => (value || '').replace(/\\s+/g, ' ').trim();
              return els.filter(element => {
                const rect = element.getBoundingClientRect(); const style = getComputedStyle(element);
                return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
              }).map((element, index) => ({
                index,
                name: normalize(element.innerText || element.getAttribute('aria-label') || element.title || ''),
                tag: element.tagName.toLowerCase(),
                role: element.getAttribute('role'),
                className: String(element.className || ''),
                href: element.getAttribute('href'),
                route: element.getAttribute('href') || element.dataset.route || element.dataset.path || null,
                depth: (() => {
                  let depth = 0; let parent = element.parentElement;
                  while (parent) {
                    if (parent.matches("aside, nav, [role=navigation], [class*=sidebar], [class*=sider]")) depth += 1;
                    parent = parent.parentElement;
                  }
                  return depth;
                })()
              })).filter(item => item.name);
            }"""
        )

    async def click_navigation_item(self, page: Any, name: str, occurrence: int = 0) -> dict[str, Any]:
        """Click a visible navigation item so an AI caller can recursively traverse menus."""
        from .interaction import normalize_control_name

        wanted = normalize_control_name(name)
        matches = []
        items = page.locator(NAVIGATION_CANDIDATE_SELECTOR)
        for index in range(await items.count()):
            item = items.nth(index)
            if await item.is_visible() and normalize_control_name(await item.inner_text()) == wanted:
                matches.append(item)
        if occurrence < 0 or occurrence >= len(matches):
            raise ValueError(f"visible navigation item '{wanted}' occurrence {occurrence} is unavailable")
        item = matches[occurrence]
        await item.scroll_into_view_if_needed()
        await item.click(timeout=10_000)
        await page.wait_for_timeout(700)
        return {
            "clicked": wanted,
            "occurrence": occurrence,
            "pageUrl": page.url,
            "route": extract_route_info(page.url),
            "navigation": await self.enumerate_navigation(page),
        }
