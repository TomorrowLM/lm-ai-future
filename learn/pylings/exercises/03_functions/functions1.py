"""
Functions Exercise 1 (functions1.py)
This exercise introduces the basics of defining and calling functions in Python.
Follow the TODO instructions and fix any issues.
Complete each section to pass all tests.
"""
"""
函数练习 1（functions1.py）
本练习介绍在 Python 中定义和调用函数的基础知识。
请按照 TODO 指示操作并修复所有问题。
完成每个部分以通过所有测试。
"""

# === BASIC FUNCTION DEFINITION ===
# === 基本函数定义 ===
# TODO: Modify the function greet(), so that it takes no arguments and returns the string "Hello, World!"
# TODO: 修改函数 greet()，使其不接受任何参数并返回字符串 "Hello, World!"

def greet():
    pass

# TODO: Define a function called farewell, that takes no argument and returns the string "Goodbye!"
# TODO: 定义一个名为 farewell 的函数，不接受任何参数，返回字符串 "Goodbye!"

# === TESTS ===
# === 测试 ===
# Call the functions with various inputs to test all conditions
# 使用各种输入调用函数以测试所有条件

# Test greet function
# 测试 greet 函数
result_one = greet()
assert result_one == "Hello, World!", f"[FAIL] Expected 'Hello, World!', got '{result_one}'"

result_two = farewell()
assert result_two == "Goodbye!", f"[FAIL] Expected 'Goodbye!', got '{result_two}'"

print(f"\n{result_one}\n{result_two}")