from typing import Any, Literal

from pydantic import BaseModel, Field


class ButtonInfo(BaseModel):
    id: str
    name: str | None = None
    description: str = "待 AI 或人工确认"
    scope: str = "view"
    target: str | None = None
    permission_code: str | None = Field(None, alias="permissionCode")
    verification_status: Literal["verified", "visual-only", "dom-only", "unverified"] = Field("unverified", alias="verificationStatus")
    action: dict[str, Any] = Field(default_factory=lambda: {"type": "record-only"})
    classification_reason: list[str] = Field(default_factory=list, alias="classificationReason")

    model_config = {"populate_by_name": True}
