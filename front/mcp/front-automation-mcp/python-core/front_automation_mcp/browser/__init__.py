"""Browser adapters grouped by lifecycle, navigation, interaction, overlays, and evidence."""

from .interaction import InteractionMixin, TAB_CANDIDATE_SELECTOR, find_text_elements, has_active_tab_class, normalize_control_name
from .navigation import NavigationMixin, extract_route_info, resolve_navigation_url
from .overlay import OverlayMixin, classify_overlay
from .readiness import ReadinessMixin, is_loading_indicator_class, is_ready_sample, readiness_fingerprint
from .scrolling import ScrollingMixin, scroll_all
from .session import BrowserSession, cdp_urls_for_port, chrome_launch_arguments, normalize_browser_start_url, session
from .snapshot import SnapshotMixin, classify_dom_candidate
from ..config import INTERACTIVE_CANDIDATE_SELECTOR, NAVIGATION_CANDIDATE_SELECTOR, OVERLAY_CANDIDATE_SELECTOR

__all__ = [
    "BrowserSession",
    "InteractionMixin",
    "TAB_CANDIDATE_SELECTOR",
    "has_active_tab_class",
    "NavigationMixin",
    "OverlayMixin",
    "ReadinessMixin",
    "ScrollingMixin",
    "SnapshotMixin",
    "classify_dom_candidate",
    "classify_overlay",
    "chrome_launch_arguments",
    "cdp_urls_for_port",
    "extract_route_info",
    "find_text_elements",
    "normalize_control_name",
    "normalize_browser_start_url",
    "INTERACTIVE_CANDIDATE_SELECTOR",
    "NAVIGATION_CANDIDATE_SELECTOR",
    "OVERLAY_CANDIDATE_SELECTOR",
    "resolve_navigation_url",
    "is_ready_sample",
    "is_loading_indicator_class",
    "readiness_fingerprint",
    "scroll_all",
    "session",
]
