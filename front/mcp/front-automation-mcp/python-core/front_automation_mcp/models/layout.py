from pydantic import BaseModel, Field, field_validator, model_validator


class LayoutTarget(BaseModel):
    """Exact visible-element metadata used by the read-only layout measurement tool."""

    id: str = Field(description="Unique identifier for this measurement result")
    frame_index: int = Field(default=0, ge=0, alias="frameIndex")
    occurrence: int | None = Field(default=None, ge=0)
    text: str | None = Field(default=None, description="Exact normalized visible text")
    tag: str | None = None
    role: str | None = None
    class_name: str | None = Field(default=None, alias="className")
    aria_label: str | None = Field(default=None, alias="ariaLabel")
    title: str | None = None

    model_config = {"populate_by_name": True, "extra": "forbid"}

    @field_validator("id")
    @classmethod
    def id_must_not_be_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("id must not be blank")
        return value

    @model_validator(mode="after")
    def require_exact_metadata(self) -> "LayoutTarget":
        if not any(
            value and value.strip()
            for value in (self.text, self.tag, self.role, self.class_name, self.aria_label, self.title)
        ):
            raise ValueError("provide at least one exact element metadata field")
        return self