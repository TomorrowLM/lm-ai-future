"""
Functions Exercise 4 (functions4.py)
This exercise builds on the previous one by exploring default parameter values and their interaction with type hints.
"""
"""
函数练习 4（functions4.py）
本练习在上一个练习的基础上，探索默认参数值及其与类型注解的交互。
"""

# TODO: Define a function that accepts an optional string `name` (default "Guest")
# It should return "Welcome, NAME!"
# TODO: 定义一个函数，接受一个可选的字符串参数 `name`（默认为 "Guest"）
# 应返回 "Welcome, NAME!"
def welcome(name: ___ = ___) -> str:
    return f"Welcome, {name}!"

# === TESTS ===
# === 测试 ===
import inspect

sig = inspect.signature(welcome)
params = sig.parameters

assert list(params.keys()) == ["name"], f"[FAIL] Function should have one parameter named 'name', got {list(params.keys())}"
assert params["name"].annotation == str, f"[FAIL] 'name' should be of type str, but got {params['name'].annotation}"
assert params["name"].default == "Guest", f"[FAIL] 'name' should default to 'Guest', got {params['name'].default}"
assert sig.return_annotation == str, f"[FAIL] Function should return a string"

assert welcome("Graham") == "Welcome, Graham!", f"[FAIL] Incorrect message when name is provided"
assert welcome() == "Welcome, Guest!", f"[FAIL] Incorrect default message"

print(welcome("Graham"))
print(welcome())