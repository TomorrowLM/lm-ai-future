import json
from typing import Any


def result(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)
