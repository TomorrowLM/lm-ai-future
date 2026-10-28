from __future__ import annotations

import asyncio
import os
import socket
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright

from .discovery import (
    default_chrome_user_data_dirs,
    extract_user_data_dir,
    read_devtools_active_port,
    running_chrome_user_data_dirs,
)
from .interaction import InteractionMixin
from .controls import ControlMixin
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


@dataclass
class BrowserConnection:
    browser_id: str
    label: str
    cdp_url: str
    browser: Browser
    user_data_dir: Path | None


class BrowserSession(ControlMixin, NavigationMixin, InteractionMixin, OverlayMixin, ReadinessMixin, ScrollingMixin, SnapshotMixin):
    def __init__(self) -> None:
        self._pw: Playwright | None = None
        self.browser: Browser | None = None
        self.context: BrowserContext | None = None
        self.cdp_url: str | None = None
        self._connections: list[BrowserConnection] = []

    @staticmethod
    def _connection_key(cdp_url: str) -> tuple[str, str]:
        parsed = urlsplit(cdp_url)
        host = (parsed.hostname or "").lower()
        if host in {"127.0.0.1", "::1", "localhost"}:
            host = "loopback"
        return host, str(parsed.port or cdp_url)

    def _find_connection(self, cdp_url: str) -> BrowserConnection | None:
        key = self._connection_key(cdp_url)
        return next(
            (
                connection
                for connection in self._connections
                if self._connection_key(connection.cdp_url) == key
            ),
            None,
        )

    async def _attach_browser(
        self,
        cdp_url: str,
        label: str,
        user_data_dir: Path | None,
    ) -> BrowserConnection:
        existing = self._find_connection(cdp_url)
        if existing:
            return existing
        if self._pw is None:
            self._pw = await async_playwright().start()
        browser = await self._pw.chromium.connect_over_cdp(cdp_url)
        connection = BrowserConnection(
            browser_id=f"chrome-{len(self._connections) + 1}",
            label=label,
            cdp_url=cdp_url,
            browser=browser,
            user_data_dir=user_data_dir,
        )
        self._connections.append(connection)
        if self.browser is None:
            self.browser = browser
            self.context = browser.contexts[0] if browser.contexts else None
            self.cdp_url = cdp_url
        return connection

    async def connect(self, cdp_url: str = "http://127.0.0.1:9222") -> dict[str, Any]:
        existing = self._find_connection(cdp_url)
        if existing:
            return {
                "connected": True,
                "pages": sum(len(context.pages) for context in existing.browser.contexts),
                "cdpUrl": existing.cdp_url,
            }
        if self._connections:
            if self.cdp_url != cdp_url:
                raise RuntimeError(f"browser session already connected to {self.cdp_url}; start a new MCP session for {cdp_url}")
        connection = await self._attach_browser(cdp_url, "Chrome CDP", None)
        if self.context is None:
            self.context = await connection.browser.new_context()
        return {
            "connected": True,
            "pages": sum(len(context.pages) for context in connection.browser.contexts),
            "cdpUrl": cdp_url,
        }

    @staticmethod
    def _browser_label(user_data_dir: Path) -> str:
        normalized_path = str(user_data_dir).lower().replace("\\", "/")
        if "chrome sxs" in normalized_path or "chrome canary" in normalized_path:
            return "Google Chrome Canary"
        if "chrome beta" in normalized_path or "google-chrome-beta" in normalized_path:
            return "Google Chrome Beta"
        if "chrome dev" in normalized_path or "google-chrome-unstable" in normalized_path:
            return "Google Chrome Dev"
        if "chromium" in normalized_path:
            return "Chromium"
        return "Google Chrome Stable"

    async def connect_browsers(self, target_url: str | None = None) -> dict[str, Any]:
        if target_url is not None:
            target_url = target_url.strip()
            parsed_target = urlsplit(target_url)
            if parsed_target.scheme not in {"http", "https"} or not parsed_target.netloc:
                raise ValueError("target URL must be an absolute http(s) URL")

        home = Path.home()
        running_dirs = running_chrome_user_data_dirs(
            sys.platform,
            home,
            os.environ,
        )
        user_data_dirs = default_chrome_user_data_dirs(
            sys.platform,
            home,
            os.environ,
        )
        seen_dirs = {
            os.path.normcase(os.path.normpath(str(user_data_dir.expanduser())))
            for user_data_dir in user_data_dirs
        }
        for user_data_dir in running_dirs:
            normalized_dir = os.path.normcase(
                os.path.normpath(str(user_data_dir.expanduser()))
            )
            if normalized_dir not in seen_dirs:
                seen_dirs.add(normalized_dir)
                user_data_dirs.append(user_data_dir)
        running_dir_keys = {
            os.path.normcase(os.path.normpath(str(user_data_dir.expanduser())))
            for user_data_dir in running_dirs
        }
        skipped: list[dict[str, str]] = []
        for user_data_dir in user_data_dirs:
            label = self._browser_label(user_data_dir)
            try:
                cdp_url = read_devtools_active_port(user_data_dir)
            except FileNotFoundError:
                normalized_dir = os.path.normcase(
                    os.path.normpath(str(user_data_dir.expanduser()))
                )
                if normalized_dir in running_dir_keys:
                    skipped.append(
                        {
                            "browserLabel": label,
                            "reason": "remote_debugging_not_enabled",
                        }
                    )
                continue
            except PermissionError:
                skipped.append({"browserLabel": label, "reason": "profile_access_denied"})
                continue
            except (OSError, ValueError):
                skipped.append({"browserLabel": label, "reason": "invalid_debug_endpoint"})
                continue

            if self._find_connection(cdp_url):
                continue
            try:
                await self._attach_browser(cdp_url, label, user_data_dir)
            except Exception as error:
                skipped.append(
                    {"browserLabel": label, "reason": f"connection_failed:{type(error).__name__}"}
                )

        browsers = [
            {
                "browserId": connection.browser_id,
                "browserLabel": connection.label,
                "cdpUrl": connection.cdp_url,
                "pages": sum(len(context.pages) for context in connection.browser.contexts),
            }
            for connection in self._connections
        ]
        result: dict[str, Any] = {
            "connected": bool(browsers),
            "browsers": browsers,
            "pages": sum(browser["pages"] for browser in browsers),
            "skipped": skipped,
        }
        if not browsers:
            result["message"] = (
                "No Chrome/Chromium instances with remote debugging enabled were found. "
                "Enable remote debugging in each browser instance first."
            )
        if target_url is not None:
            entries = (
                await self.page_entries()
                if self._connections or self.context
                else []
            )
            matches = []
            for index, (page, browser_id, browser_label) in enumerate(entries):
                if page.url != target_url:
                    continue
                try:
                    page_title = await page.title()
                except Exception:
                    page_title = ""
                matches.append(
                    {
                        "index": index,
                        "browserId": browser_id,
                        "browserLabel": browser_label,
                        "url": page.url,
                        "title": page_title,
                    }
                )

            if matches:
                status = "matched" if len(matches) == 1 else "ambiguous"
            elif not browsers:
                status = "no_debuggable_instances"
            elif result["pages"] == 0:
                status = "connected_instances_empty"
            else:
                status = "url_mismatch"
            result["targetDiagnostic"] = {
                "targetUrl": target_url,
                "status": status,
                "scope": "currently attached Chrome/Chromium pages",
                "checkedPageCount": result["pages"],
                "skippedInstanceCount": len(skipped),
                "matches": matches,
            }
        return result

    async def pages(self) -> list[Page]:
        if self._connections:
            return [
                page
                for connection in self._connections
                for context in connection.browser.contexts
                for page in context.pages
            ]
        if not self.context:
            raise RuntimeError("browser is not connected; call connect_browser first")
        contexts = self.browser.contexts if self.browser else [self.context]
        return [page for context in contexts for page in context.pages]

    async def page_entries(self) -> list[tuple[Page, str, str]]:
        if self._connections:
            return [
                (page, connection.browser_id, connection.label)
                for connection in self._connections
                for context in connection.browser.contexts
                for page in context.pages
            ]
        return [(page, "chrome-1", "Chrome") for page in await self.pages()]

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
