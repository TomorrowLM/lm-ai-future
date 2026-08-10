"""
Functions Exercise 5 (functions5.py)
This exercise introduces returning multiple values from a function using tuples.
"""
"""
函数练习 5（functions5.py）
本练习介绍使用元组从函数返回多个值。
"""

# TODO: Define a function `basic_stats` that takes two numbers and returns:
# (1) their sum, (2) their product, and (3) their average
# Return these three values as a tuple
# TODO: 定义一个函数 `basic_stats`，接受两个数字并返回：
# (1) 它们的和，(2) 它们的积，以及 (3) 它们的平均值
# 将这三个值作为元组返回

def basic_stats(a: float, b: float) -> tuple:
    pass

# === TESTS ===
# === 测试 ===
import inspect

sig = inspect.signature(basic_stats)
params = sig.parameters

assert list(params.keys()) == ["a", "b"], f"[FAIL] Function should have two parameters 'a' and 'b', got {list(params.keys())}"
assert all(p.annotation == float for p in params.values()), f"[FAIL] Parameters should be floats, got {[p.annotation for p in params.values()]}"
assert sig.return_annotation == tuple, f"[FAIL] Function should return a tuple"

sum_, product, average = basic_stats(4.0, 2.0)
assert sum_ == 6.0, f"[FAIL] Sum incorrect, got {sum_}"
assert product == 8.0, f"[FAIL] Product incorrect, got {product}"
assert average == 3.0, f"[FAIL] Average incorrect, got {average}"

print(f"Sum: {sum_}, Product: {product}, Average: {average}")