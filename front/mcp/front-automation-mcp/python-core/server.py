"""Executable compatibility entrypoint for front-automation-mcp."""

from front_automation_mcp.server import create_server, main, mcp

__all__ = ["create_server", "main", "mcp"]


if __name__ == "__main__":
    main()
