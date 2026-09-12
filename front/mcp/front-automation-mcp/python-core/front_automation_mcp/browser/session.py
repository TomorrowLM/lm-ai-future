from __future__ import annotations

import asyncio
import socket
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright

from .interaction import InteractionMixin
from .navigation import NavigationMixin
from .overlay import OverlayMixin
from .readiness import ReadinessMixin
from .scrolling import ScrollingMixin
from .snapshot import SnapshotMixin


def normalize_browser_start_url(url: str) -> str:
    target = url.strip() or "about:blank"
    if target == "about:blank":
        return target
    if urlsplit(target).scheme not in {"http", "https"}:
        raise ValueError("browser start URL must be http(s) or blank")
    return target


def chrome_launch_arguments(port: int, profile_dir: str) -> list[str]:
    if not 1 <= port <= 65535:
        raise ValueError("CDP port must be between 1 and 65535")
    return ["-na", "Google Chrome", "--args", f"--remote-debugging-port={port}", f"--user-data-dir={profile_dir}"]


def cdp_urls_for_port(port: int) -> list[str]:
    if not 1 <= port <= 65535:
        raise ValueError("CDP port must be between 1 and 65535")
    return [f"http://[::1]:{port}", f"http://127.0.0.1:{port}"]


class BrowserSession(NavigationMixin, InteractionMixin, OverlayMixin, ReadinessMixin, ScrollingMixin, SnapshotMixin):
    def __init__(self) -> None:
        self._pw: Playwright | None = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.cdp_url: str | None = None

    async def connect(self, cdp_url: str = "http://127.0.0.1:9222") -> dict[str, Any]:
        if self.context:
            if self.cdp_url != cdp_url:
                raise RuntimeError(f"browser session already connected to {self.cdp_url}; start a new MCP session for {cdp_url}")
            return {"connected": True, "pages": len(self.context.pages), "cdpUrl": cdp_url}
        self._pw = await async_playwright().start()
        self.browser = await self._pw.chromium.connect_over_cdp(cdp_url)
        self.context = self.browser.contexts[0] if self.browser.contexts else await self.browser.new_context()
        self.cdp_url = cdp_url
        return {"connected": True, "pages": len(self.context.pages), "cdpUrl": cdp_url}

    async def pages(self) -> list[Page]:
        if not self.context:
            raise RuntimeError("browser is not connected; call connect_browser first")
        return list(self.context.pages)

    async def page(self, index: int = 0) -> Page:
        pages = await self.pages()
        if not pages or index >= len(pages):
            raise IndexError(f"page index {index} is unavailable")
        return pages[index]

    async def open_page(self, url: str = "") -> dict[str, Any]:
        if not self.context:
            raise RuntimeError("browser is not connected; call connect_browser first")
        target_url = normalize_browser_start_url(url)
        page = await self.context.new_page()
        if target_url != "about:blank":
            await page.goto(target_url, wait_until="domcontentloaded", timeout=30_000)
        pages = await self.pages()
        return {"opened": True, "pageIndex": pages.index(page), "pageUrl": page.url, "title": await page.title()}

    async def _probe_cdp_endpoint(self, cdp_url: str) -> bool:
        def probe() -> bool:
            parsed = urlsplit(cdp_url)
            host = parsed.hostname or "127.0.0.1"
            port = parsed.port or 9222
            family = socket.AF_INET6 if ":" in host else socket.AF_INET
            line_end = bytes([13, 10])
            try:
                with socket.socket(family, socket.SOCK_STREAM) as sock:
                    sock.settimeout(1.0)
                    address = (host, port, 0, 0) if family == socket.AF_INET6 else (host, port)
                    sock.connect(address)
                    request = b"GET /json/version HTTP/1.1" + line_end + b"Host: localhost" + line_end + b"Connection: close" + line_end + line_end
                    sock.sendall(request)
                    return sock.recv(64).startswith(b"HTTP/1.1 200")
            except (OSError, TimeoutError):
                return False

        return await asyncio.to_thread(probe)

    async def launch_login_browser(self, port: int = 9222, profile_dir: str = "/private/tmp/front-automation-mcp-chrome-profile") -> dict[str, Any]:
        for cdp_url in cdp_urls_for_port(port):
            if await self._probe_cdp_endpoint(cdp_url):
                return {
                    "launched": False,
                    "reused": True,
                    "browserLabel": f"Chrome-{port}",
                    "cdpUrl": cdp_url,
                    "nextStep": "connect_browser to the existing CDP endpoint; pages: 0 means no page is currently open",
                }

        sock = socket.socket()
        try:
            sock.bind(("127.0.0.1", port))
        except OSError as exc:
            raise RuntimeError(
                f"CDP port {port} is in use but is not a reachable Chrome CDP endpoint; refusing to launch or disturb it"
            ) from exc
        finally:
            sock.close()
        base_profile = Path(profile_dir).expanduser().resolve()
        profile = base_profile.parent / f"{base_profile.name}-{port}"
        profile.mkdir(parents=True, exist_ok=True)
        process = await asyncio.create_subprocess_exec("open", *chrome_launch_arguments(port, str(profile)))
        await process.wait()
        return {
            "launched": True,
            "reused": False,
            "browserLabel": f"Chrome-{port}",
            "cdpUrl": cdp_urls_for_port(port)[0],
            "profileDir": str(profile),
            "nextStep": "user enters the application address and signs in manually",
        }


session = BrowserSession()
