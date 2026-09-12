"""Backward-compatible facade for the modular browser package.

New code should import from ``front_automation_mcp.browser``. This module
remains so existing scripts and tests using ``import browser`` keep working.
"""

from front_automation_mcp.browser import (
    BrowserSession,
    INTERACTIVE_CANDIDATE_SELECTOR,
    NAVIGATION_CANDIDATE_SELECTOR,
    OVERLAY_CANDIDATE_SELECTOR,
    TAB_CANDIDATE_SELECTOR,
    classify_dom_candidate,
    classify_overlay,
    cdp_urls_for_port,
    chrome_launch_arguments,
    extract_route_info,
    find_text_elements,
    has_active_tab_class,
    is_ready_sample,
    is_loading_indicator_class,
    normalize_browser_start_url,
    normalize_control_name,
    readiness_fingerprint,
    resolve_navigation_url,
    scroll_all,
    session,
)
from front_automation_mcp.config import CANDIDATE_EVALUATOR as _CANDIDATE_EVALUATOR

__all__ = [
    "BrowserSession",
    "INTERACTIVE_CANDIDATE_SELECTOR",
    "NAVIGATION_CANDIDATE_SELECTOR",
    "OVERLAY_CANDIDATE_SELECTOR",
    "TAB_CANDIDATE_SELECTOR",
    "classify_dom_candidate",
    "classify_overlay",
    "chrome_launch_arguments",
    "cdp_urls_for_port",
    "extract_route_info",
    "find_text_elements",
    "has_active_tab_class",
    "is_ready_sample",
    "is_loading_indicator_class",
    "normalize_browser_start_url",
    "normalize_control_name",
    "readiness_fingerprint",
    "resolve_navigation_url",
    "scroll_all",
    "session",
]
