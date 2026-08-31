import ast
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EXAMPLE_SCRIPTS = (
    PROJECT_ROOT / "study/day1-demo/req_call.py",
    PROJECT_ROOT / "study/day4-langchain/example/llm_app.py",
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