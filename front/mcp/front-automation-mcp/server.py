"""Outer MCP launcher; the Python implementation lives in ``python-core``."""

import sys
from pathlib import Path


PYTHON_CORE = Path(__file__).resolve().parent / "python-core"
if str(PYTHON_CORE) not in sys.path:
    sys.path.insert(0, str(PYTHON_CORE))

from front_automation_mcp.server import create_server, main, mcp  # noqa: E402

__all__ = ["create_server", "main", "mcp"]


if __name__ == "__main__":
    main()
