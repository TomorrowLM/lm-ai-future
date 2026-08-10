"""
Functions Exercise 2 (functions2.py)
This exercise introduces functions with parameters, return values, and basic operations.
Follow the TODO instructions and fix any issues.
Complete each section to pass all tests.
"""
"""
函数练习 2（functions2.py）
本练习介绍带参数、返回值和基本操作的函数。
请按照 TODO 指示操作并修复所有问题。
完成每个部分以通过所有测试。
"""

# === FUNCTION WITH MULTIPLE PARAMETERS ===
# === 带多个参数的函数 ===
# TODO: Define a function that multiplies two numbers and returns the result
# TODO: 定义一个函数，将两个数字相乘并返回结果

def multiply_numbers():
    # TODO: Return the product of a and b
    # TODO: 返回 a 和 b 的乘积
    pass

# === FUNCTION WITH DEFAULT PARAMETER ===
# === 带默认参数的函数 ===
# TODO: Define a function that returns a greeting with an optional name parameter
# If no name is provided, default to "Guest"
# TODO: 定义一个函数，返回带有可选 name 参数的问候语
# 如果没有提供名称，默认使用 "Guest"

def welcome_message():
    # TODO: Return a greeting message "Hello, name!" that includes the name
    # TODO: 返回包含名称的问候消息 "Hello, name!"
    pass

# === TESTS ===
# === 测试 ===
# Call the functions with various inputs to test all conditions
# 使用各种输入调用函数以测试所有条件

# Test multiply_numbers function
# 测试 multiply_numbers 函数
result_one = multiply_numbers(3, 4)
assert result_one == 12, f"[FAIL] Expected 12, got '{result_one}'"

result_two = welcome_message("there")
assert result_two == "Hello, there!", f"[FAIL] Expected 'Hello, there!', got '{result_two}'"

result_three = welcome_message()
assert result_three == "Hello, Guest!", f"[FAIL] Expected 'Hello, Guest!', got '{result_three}'"

print(f"\n{result_one}\n{result_two}\{result_three}")