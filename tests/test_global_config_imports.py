import ast
import os
from pathlib import Path
import subprocess
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXAMPLE_SCRIPTS = (
    PROJECT_ROOT / "study/day1-demo/req_call.py",
    PROJECT_ROOT / "study/day4-langchain/03-LCEL/01-stream_llm.py",
)


def imported_modules(script: Path) -> set[str]:
    tree = ast.parse(script.read_text())
    from_imports = {
        node.module
        for node in ast.walk(tree)
        if isinstance(node, ast.ImportFrom) and node.module is not None
    }
    imports = {
        alias.name
        for node in ast.walk(tree)
        if isinstance(node, ast.Import)
        for alias in node.names
    }
    return from_imports | imports


def test_examples_use_global_core_config() -> None:
    for script in EXAMPLE_SCRIPTS:
        modules = imported_modules(script)
        assert "core.config" in modules
        assert "study.config" not in modules


def test_core_config_loads_env_from_project_root() -> None:
    environment = os.environ.copy()
    environment["PYTHONPATH"] = str(PROJECT_ROOT)
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            "import os, core.config; print(os.getenv('DEEPSEEK_BASE_URL'))",
        ],
        cwd="/tmp",
        env=environment,
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.stdout.strip() == "https://api.deepseek.com/v1"