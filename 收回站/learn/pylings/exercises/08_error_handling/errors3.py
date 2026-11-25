"""
Errors Exercise 3 (errors3.py)
This exercise introduces raising exceptions with `raise` and using `finally` to ensure cleanup.
Follow the TODO instructions and complete each section to pass all tests.
"""
"""
错误处理练习 3（errors3.py）
本练习介绍使用 `raise` 抛出异常以及使用 `finally` 确保清理操作。
请按照 TODO 指示操作并完成每个部分以通过所有测试。
"""

# TODO: Raise a ValueError if the input number is negative
# TODO: 如果输入的数字为负数，则抛出 ValueError
def check_positive(number):
    # If number is negative, raise a ValueError with the message "Number must be positive"
    # 如果数字为负数，用消息 "Number must be positive" 抛出 ValueError
    # Otherwise, return the number
    # 否则，返回该数字
    pass


# TODO: Raise a TypeError if inputs are not both integers
# TODO: 如果输入不都是整数，则抛出 TypeError
def add_integers(a, b):
    # If a or b is not an integer, raise a TypeError with "Inputs must be integers"
    # 如果 a 或 b 不是整数，用 "Inputs must be integers" 抛出 TypeError
    # Otherwise, return the sum
    # 否则，返回和
    pass


# TODO: Use a finally block to ensure a file is always closed
# TODO: 使用 finally 代码块确保文件始终被关闭
def safe_file_read(filename):
    # Try opening the file and reading its content
    # 尝试打开文件并读取其内容
    # If the file doesn't exist, catch FileNotFoundError and return "File not found."
    # 如果文件不存在，捕获 FileNotFoundError 并返回 "File not found."
    # In the finally block, ensure the file is closed
    # 在 finally 代码块中，确保文件被关闭
    pass


# Tests to check if your code works
# 测试你的代码是否正常工作
# Testing check_positive
# 测试 check_positive
try:
    result_one = check_positive(-5)
except ValueError as e:
    result_one = str(e)
    assert result_one == "Number must be positive", f"Expected ValueError: Number must be positive, but got {result_one}"

result_two = check_positive(10)
assert result_two == 10, "Positive numbers should be returned as is."

# Testing add_integers
# 测试 add_integers
try:
    result_three = add_integers(10, "five")
except TypeError as e:
    result_three = str(e)
    assert result_three == "Inputs must be integers", f"Expected TypeError: Inputs must be integers, but got {result_three}"

result_four = add_integers(4, 6)
assert result_four == 10, "4 + 6 should return 10"

# Testing safe_file_read
# 测试 safe_file_read
result_five = safe_file_read("missing_file.txt")
assert  result_five == "File not found.", f"Expected: File not found. But got, {result_five}"

print(result_one)
print(result_two)
print(result_three)
print(result_four)
print(result_five)