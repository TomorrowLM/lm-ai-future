"""
Conditionals Exercise 4 (conditionals4.py)
This exercise introduces the use of match-case (Python's structural pattern matching).
Available from Python 3.10 onwards.
"""
"""
条件语句练习 4（conditionals4.py）
本练习介绍 match-case（Python 的结构化模式匹配）的用法。
从 Python 3.10 开始可用。
"""

# TODO: Define a function `http_status` that takes an integer `code` and returns a string message.
# Use match-case to return the following:
# - 200: "OK"
# - 301: "Moved Permanently"
# - 404: "Not Found"
# - 500: "Internal Server Error"
# - Any other value: "Unknown Status"
# TODO: 定义一个函数 `http_status`，接受一个整数 `code` 并返回一个字符串消息。
# 使用 match-case 返回以下内容：
# - 200: "OK"
# - 301: "Moved Permanently"
# - 404: "Not Found"
# - 500: "Internal Server Error"
# - 其他任何值: "Unknown Status"

def http_status(code: int) -> str:
    pass

# === TESTS ===
# === 测试 ===
import inspect

sig = inspect.signature(http_status)
params = sig.parameters

assert list(params.keys()) == ["code"], f"[FAIL] Function should take one parameter 'code'"
assert params["code"].annotation == int, f"[FAIL] 'code' should be of type int"
assert sig.return_annotation == str, f"[FAIL] Function should return a string"

assert http_status(200) == "OK", "[FAIL] Expected 'OK'"
assert http_status(301) == "Moved Permanently", "[FAIL] Expected 'Moved Permanently'"
assert http_status(404) == "Not Found", "[FAIL] Expected 'Not Found'"
assert http_status(500) == "Internal Server Error", "[FAIL] Expected 'Internal Server Error'"
assert http_status(123) == "Unknown Status", "[FAIL] Expected 'Unknown Status'"

print("All tests passed!")
