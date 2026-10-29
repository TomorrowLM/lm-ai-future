from __future__ import annotations

from mcp.server.fastmcp import FastMCP

from .browser import session
from .tools import register_browser_tools, register_collection_tools


def create_server() -> FastMCP:
    server = FastMCP("lm-browser")
    register_browser_tools(server, session)
    register_collection_tools(server, session)
    return server


mcp = create_server()


def main() -> None:
    mcp.run()


if __name__ == "__main__":
    main()


__all__ = ["create_server", "main", "mcp"]
