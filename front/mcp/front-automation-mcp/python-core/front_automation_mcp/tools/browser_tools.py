from __future__ import annotations

from typing import Any

from ..serializers import result


def register_browser_tools(mcp: Any, session: Any) -> None:
    @mcp.tool()
    async def connect_browser(cdp_url: str = "http://127.0.0.1:9222") -> str:
        """Connect to an existing Chrome CDP session without changing business data."""
        return result(await session.connect(cdp_url))

    @mcp.tool()
    async def connect_browsers() -> str:
        """Discover and connect to running Chrome/Chromium instances with remote debugging enabled."""
        return result(await session.connect_browsers())

    @mcp.tool()
    async def list_pages() -> str:
        """List currently attached browser pages and URLs."""
        entries = await session.page_entries()
        return result(
            [
                {
                    "index": index,
                    "browserId": browser_id,
                    "browserLabel": browser_label,
                    "url": page.url,
                    "title": await page.title(),
                }
                for index, (page, browser_id, browser_label) in enumerate(entries)
            ]
        )

    @mcp.tool()
    async def open_browser_page(url: str = "") -> str:
        """Open a blank or http(s) page for the user to enter an address and complete login."""
        return result(await session.open_page(url))

    @mcp.tool()
    async def launch_login_browser(cdp_port: int = 9222) -> str:
        """Reuse the current CDP endpoint when reachable; otherwise launch an isolated Chrome window for manual address entry and login. An empty pages list is not a reason to launch another browser."""
        return result(await session.launch_login_browser(port=cdp_port))

    @mcp.tool()
    async def navigate_page(route_or_url: str, page_index: int = 0) -> str:
        """Navigate within the active application's origin. Hash routes may be passed as /route."""
        return result(await session.navigate(await session.page(page_index), route_or_url))

    @mcp.tool()
    async def wait_until_ready(page_index: int = 0, max_rounds: int = 8, interval_ms: int = 500, stable_rounds: int = 2) -> str:
        """Wait for route, DOM fingerprint, visible loading indicators, and iframe ready states to stabilize before screenshots or collection."""
        return result(await session.wait_until_ready(await session.page(page_index), max_rounds, interval_ms, stable_rounds))

    @mcp.tool()
    async def fill_text_control(name: str, value: str, occurrence: int = 0, page_index: int = 0, sensitive: bool = True) -> str:
        """Fill one visible text control selected by AI-provided exact metadata; never return the value."""
        return result(await session.fill_text_control(await session.page(page_index), name, value, occurrence, sensitive))

    @mcp.tool()
    async def click_visible_control(name: str, occurrence: int = 0, page_index: int = 0) -> str:
        """Click one visible control selected by AI-provided exact metadata and return state evidence."""
        return result(await session.click_visible_control(await session.page(page_index), name, occurrence))

    @mcp.tool()
    async def select_visible_option(control_name: str, option_name: str, occurrence: int = 0, page_index: int = 0) -> str:
        """Select one visible option from a control selected by AI-provided exact metadata."""
        return result(await session.select_visible_option(await session.page(page_index), control_name, option_name, occurrence))

    @mcp.tool()
    async def switch_tab(name: str, occurrence: int = 0, page_index: int = 0) -> str:
        """Switch a visible UI Tab by exact text; this changes only the active view and never submits data."""
        return result(await session.switch_tab(await session.page(page_index), name, occurrence))

    @mcp.tool()
    async def find_text_elements(text: str, page_index: int = 0) -> str:
        """Return visible DOM elements whose rendered text exactly matches text."""
        return result(await session.find_text_elements(await session.page(page_index), text))

    @mcp.tool()
    async def click_and_collect_overlay(name: str, occurrence: int = 0, page_index: int = 0) -> str:
        """Click one low-risk visible control, classify overlay/page/state transition, and return post-click evidence; page transitions require a follow-up detail collection and never submit or save."""
        return result(await session.click_and_collect_overlay(await session.page(page_index), name, occurrence))

    @mcp.tool()
    async def close_overlay(page_index: int = 0) -> str:
        """Close the current low-risk Dialog/Drawer using Escape or a visible close control; never submits business data."""
        return result(await session.close_overlay(await session.page(page_index)))

    @mcp.tool()
    async def enumerate_navigation(page_index: int = 0) -> str:
        """Enumerate visible side/navigation menu candidates, including framework-specific Vue and React items."""
        return result(await session.enumerate_navigation(await session.page(page_index)))

    @mcp.tool()
    async def click_navigation_item(name: str, occurrence: int = 0, page_index: int = 0) -> str:
        """Click a visible menu item and return its route and the next navigation level for recursive traversal."""
        return result(await session.click_navigation_item(await session.page(page_index), name, occurrence))
