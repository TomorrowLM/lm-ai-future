"""Public data contracts for browser evidence and structured page output."""

from .candidate import ButtonInfo
from .route import RouteInfo
from .snapshot import Snapshot
from .structure import ViewNode

__all__ = ["ButtonInfo", "RouteInfo", "Snapshot", "ViewNode"]
