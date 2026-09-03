from typing import Any

from langchain_core.runnables import Runnable, RunnableConfig


class PrefixRunnable(Runnable[str, str]):
    def __init__(self, prefix: str) -> None:
        self.prefix = prefix

    def invoke(
        self,
        input: str,
        config: RunnableConfig | None = None,
        **kwargs: Any,
    ) -> str:
        return f"{self.prefix}{input}"
