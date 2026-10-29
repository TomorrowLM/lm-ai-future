"""Executable compatibility entrypoint for lm-browser."""

from front_automation_mcp.server import create_server, main, mcp

__all__ = ["create_server", "main", "mcp"]


if __name__ == "__main__":
    main()
