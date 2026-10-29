from typing import Any

from pydantic import BaseModel, Field

from .route import RouteInfo


class Snapshot(BaseModel):
    page_url: str = Field(alias="pageUrl")
    route: RouteInfo | None = None
    title: str
    screenshot_path: str | None = Field(None, alias="screenshotPath")
    dom_text: str = Field("", alias="domText")
    interactive_candidates: list[dict[str, Any]] = Field(default_factory=list, alias="interactiveCandidates")
    dom_candidates: list[dict[str, Any]] = Field(default_factory=list, alias="domCandidates")
    candidate_count: int = Field(0, alias="candidateCount")
    frames: list[dict[str, Any]] = Field(default_factory=list)

    model_config = {"populate_by_name": True}
