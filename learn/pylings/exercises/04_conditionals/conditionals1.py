"""
If Statements Exercise 1 (conditionals1.py)
This exercise introduces basic if statements and comparison operations in Python.
Follow the TODO instructions and fix any issues.
Uncomment and complete each section to pass all tests.
Try experimenting with different comparison operators: ==, !=, <, <=, >, >=
"""
"""
if 语句练习 1（conditionals1.py）
本练习介绍 Python 中的基本 if 语句和比较操作。
请按照 TODO 指示操作并修复所有问题。取消注释并完成每个部分以通过所有测试。
尝试使用不同的比较运算符进行实验：==、!=、<、<=、>、>=
"""

# === COMPARISON FUNCTIONS ===
# === 比较函数 ===
# TODO: Fill in the correct comparison operators in each function
# TODO: 在每个函数中填入正确的比较运算符

def is_equal(a, b):
    if a __ b:
        return "a is equal to b"
    else:
        return "a is not equal to b"

def is_not_equal(a, b):
    if a __ b:
        return "a is not equal to b"
    else:
        return "a is equal to b"

def is_less_than(a, b):
    if a __ b:
        return "a is less than b"
    else:
        return "a is not less than b"

def is_less_than_or_equal(a, b):
    if a __ b:
        return "a is less than or equal to b"
    else:
        return "a is greater than b"

def is_greater_than(a, b):
    if a __ b:
        return "a is greater than b"
    else:
        return "a is not greater than b"

def is_greater_than_or_equal(a, b):
    if a __ b:
        return "a is greater than or equal to b"
    else:
        return "a is less than b"

# === TESTS ===
# === 测试 ===
# Call the comparison functions with various inputs to test all comparison cases
# 使用各种输入调用比较函数以测试所有比较情况

# Test equal
# 测试相等
result_one = is_equal(10, 10)
assert result_one == "a is equal to b", f"[FAIL] Expected 'a is equal to b', got '{result_one}'"

# Test not equal
# 测试不等
result_two = is_not_equal(10, 5)
assert result_two == "a is not equal to b", f"[FAIL] Expected 'a is not equal to b', got '{result_two}'"

# Test less than
# 测试小于
result_three = is_less_than(5, 10)
assert result_three == "a is less than b", f"[FAIL] Expected 'a is less than b', got '{result_three}'"

# Test less than or equal
# 测试小于等于
result_four = is_less_than_or_equal(10, 20)
assert result_four == "a is less than or equal to b", f"[FAIL] Expected 'a is less than or equal to b', got '{result_four}'"

# Test greater than
# 测试大于
result_five = is_greater_than(20, 10)
assert result_five == "a is greater than b", f"[FAIL] Expected 'a is greater than b', got '{result_five}'"

# Test greater than or equal
# 测试大于等于
result_six = is_greater_than_or_equal(20, 20)
assert result_six == "a is greater than or equal to b", f"[FAIL] Expected 'a is greater than or equal to b', got '{result_six}'"

print(f"\n{result_one}\n{result_two}\n{result_three}\n{result_four}\n{result_five}\n{result_six}.")