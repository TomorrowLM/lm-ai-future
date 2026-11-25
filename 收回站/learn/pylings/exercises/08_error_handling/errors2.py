"""
Errors Exercise 2 (errors2.py)
This exercise expands on errors1 by using explicit error handling.
Instead of returning a string, return the actual exception type.
Use `type(exception)` to compare with expected exceptions.
Refer to: https://docs.python.org/3/library/exceptions.html
Follow the TODO instructions and complete each section to pass all tests.
"""
"""
错误处理练习 2（errors2.py）
本练习在 errors1 的基础上使用显式错误处理进行扩展。
不是返回字符串，而是返回实际的异常类型。
使用 `type(exception)` 与预期的异常进行比较。
参考：https://docs.python.org/3/library/exceptions.html
请按照 TODO 指示操作并完成每个部分以通过所有测试。
"""

# TODO: Ensure the function returns the correct exception type
# Implement each function to return the actual exception type
# TODO: 确保函数返回正确的异常类型
# 实现每个函数以返回实际的异常类型

# TODO: Catch the correct error when dividing by zero
# TODO: 捕获除以零时的正确错误
def catch_zero_division(a, b):
    try:
        return a / b
    except:
        return None  # TODO: Return the actual exception type


# TODO: Catch the correct error when converting an invalid string to an integer
# TODO: 捕获将无效字符串转换为整数时的正确错误
def catch_value_error(value):
    try:
        return int(value)
    except:
        return None  # TODO: Return the actual exception type


# TODO: Catch the correct error when accessing an invalid list index
# TODO: 捕获访问无效列表索引时的正确错误
def catch_index_error(lst, index):
    try:
        return lst[index]
    except:
        return None  # TODO: Return the actual exception type


# TODO: Catch the correct errorwhen accessing a non-existent dictionary key
# TODO: 捕获访问不存在的字典键时的正确错误
def catch_key_error(dictionary, key):
    try:
        return dictionary[key]
    except:
        return None  # TODO: Return the actual exception type

# DO NOT TOUCH #
# 请勿修改 #
# This function demonstrates a generic exception handler
# With the use of type(), we can return the type from generic exception
# 此函数演示通用异常处理器
# 通过使用 type()，我们可以从通用异常中返回类型
def generic_exception(a, b):
    try: 
        return  b / c
    except Exception as e:
        print(f"Exception: {type(e)}")
    pass

generic_exception(1, 0)  # Should print an exception message

# Tests to check if your functions work
# The return value should match the actual exception type
# 测试你的函数是否正常工作
# 返回值应与实际的异常类型匹配

# Testing catch_zero_division
# 测试 catch_zero_division
result_one = catch_zero_division(1, 0)
assert result_one == ZeroDivisionError, f"Expected: ZeroDivisionError, but got {result_one}"

# Testing catch_value_error
# 测试 catch_value_error
result_two = catch_value_error("abc")
assert result_two == ValueError, f"Expected: ValueError, but got {result_two}"

# Testing catch_index_error
# 测试 catch_index_error
sample_list = [1, 2, 3]
result_three = catch_index_error(sample_list, 5)
assert result_three == IndexError, f"Expected: IndexError, but got {result_three}"

# Testing catch_key_error
# 测试 catch_key_error
sample_dict = {"name": "Guido van Rossum"}
result_four = catch_key_error(sample_dict, "age")
assert result_four == KeyError, f"Expected: KeyError, but got {result_four}"


print(f"Exception: {result_one}")
print(f"Exception: {result_two}")
print(f"Exception: {result_three}")
print(f"Exception: {result_four}")