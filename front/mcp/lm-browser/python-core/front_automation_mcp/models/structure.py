from pydantic import BaseModel, Field

from .candidate import ButtonInfo
from .route import RouteInfo


class ViewNode(BaseModel):
    id: str
    name: str
    type: str
    route: RouteInfo | None = None
    buttons: list[ButtonInfo] = Field(default_factory=list)
    children: list["ViewNode"] = Field(default_factory=list)
