"""
Errors Exercise 1 (errors1.py)
This exercise introduces basic error handling in Python.
You will learn how to catch common runtime errors using try and except blocks.
Follow the TODO instructions and complete each section to pass all tests.
"""
"""
错误处理练习 1（errors1.py）
本练习介绍 Python 中的基本错误处理。
你将学习如何使用 try 和 except 代码块捕获常见的运行时错误。
请按照 TODO 指示操作并完成每个部分以通过所有测试。
"""

# TODO: Handle the error, generically, when dividing two numbers
# TODO: 以通用方式处理两数相除时的错误
def safe_divide(a, b):
    # Attempt to divide a by b
    # 尝试将 a 除以 b
    # If b is zero, catch the error and return "Cannot divide by zero!"
    # 如果 b 为零，捕获错误并返回 "Cannot divide by zero!"
    pass


# TODO: Handle the error, generically, when converting a string to an integer
# TODO: 以通用方式处理将字符串转换为整数时的错误
def string_to_int(s):
    # Attempt to convert the string s to an integer
    # 尝试将字符串 s 转换为整数
    # If conversion fails, return "Invalid integer input."
    # 如果转换失败，返回 "Invalid integer input."
    pass


# TODO: Handle the error, generically, when accessing a list element
# TODO: 以通用方式处理访问列表元素时的错误
def access_list_element(lst, index):
    # Attempt to return the element at the given index
    # 尝试返回给定索引处的元素
    # If the index is out of range, return "Index out of range."
    # 如果索引超出范围，返回 "Index out of range."
    pass


# === TESTS ===
# === 测试 ===
# DO NOT TOUCH 
# 请勿修改
# Testing safe_divide
# 测试 safe_divide
result_one = safe_divide(10, 2)
assert result_one  == 5, "10 divided by 2 should return 5"

result_two = safe_divide(10, 0) 
assert result_two == "Cannot divide by zero!", f"Expected: Cannot divide by zero!, but got {result_two}"

# Testing string_to_int
# 测试 string_to_int
result_three = string_to_int("123") 
assert result_three  == 123, f"Expected: String '123', but got {result_three}"

result_four = string_to_int("abc")
assert result_four == "Invalid integer input", f"Expected: Invalid integer input, but got {result_four}"

# Testing access_list_element
# 测试 access_list_element
sample_list = [1, 2, 3, 4, 5]
result_five = access_list_element(sample_list, 2)
assert result_five == 3, f"Expected: 3, but got {result_five}"

result_six = access_list_element(sample_list, 10) 
assert result_six == "Index out of range", f"Expected: Index out of range, but got {result_six}"


print(f"{result_one}")
print(f"{result_two}")
print(f"{result_three}")
print(f"{result_four}")
print(f"{result_five}")
print(f"{result_six}")