from pydantic import BaseModel, Field


class RouteInfo(BaseModel):
    path: str
    full_url: str = Field(alias="fullUrl")

    model_config = {"populate_by_name": True}
