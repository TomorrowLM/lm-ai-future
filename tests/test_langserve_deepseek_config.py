import ast
from pathlib import Path


SERVER_FILE = (
    Path(__file__).resolve().parents[1]
    / "study/day5-langchain-chat-model/02-langserve/app/server.py"
)


def test_langserve_routes_use_project_deepseek_config() -> None:
    tree = ast.parse(SERVER_FILE.read_text())
    calls = [
        node
        for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Name)
        and node.func.id == "ChatOpenAI"
    ]

    assert len(calls) == 1
    call = calls[0]
    keywords = {keyword.arg: keyword.value for keyword in call.keywords}

    assert ast.literal_eval(keywords["model"]) == "deepseek-chat"
    assert ast.unparse(keywords["base_url"]) == "os.getenv('DEEPSEEK_BASE_URL')"
    assert ast.unparse(keywords["api_key"]) == "os.getenv('DEEPSEEK_API_KEY')"
