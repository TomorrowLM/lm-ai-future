"""
Errors Exercise 4 (errors4.py)
This exercise introduces custom exceptions.
Create and raise their own exception classes.
Follow the TODO instructions and complete each section to pass all tests.
"""
"""
错误处理练习 4（errors4.py）
本练习介绍自定义异常。
创建并抛出自己的异常类。
请按照 TODO 指示操作并完成每个部分以通过所有测试。
"""

# TODO: Define a custom exception called NegativeNumberError
# This exception should inherit from Exception
# TODO: 定义一个名为 NegativeNumberError 的自定义异常
# 此异常应继承自 Exception


# TODO: Define a function validate_positive that raises NegativeNumberError
# if the input number is negative
# TODO: 定义一个函数 validate_positive，如果输入数字为负数则抛出 NegativeNumberError
def validate_positive(number):
    # If number is negative, raise NegativeNumberError with message "Negative numbers are not allowed."
    # 如果数字为负数，用消息 "Negative numbers are not allowed." 抛出 NegativeNumberError
    pass


# TODO: Define a custom exception called InvalidAgeError
# This exception should inherit from Exception
# TODO: 定义一个名为 InvalidAgeError 的自定义异常
# 此异常应继承自 Exception


# TODO: Define a function check_age that raises InvalidAgeError
# if age is below 0 or greater than 120
# TODO: 定义一个函数 check_age，当年龄低于 0 或大于 120 时抛出 InvalidAgeError
def check_age(age):
    # If age is below 0 or above 120, raise InvalidAgeError with message "Invalid age."
    # 如果年龄低于 0 或高于 120，用消息 "Invalid age." 抛出 InvalidAgeError
    pass


# TODO: Define a function withdraw_money that raises a custom InsufficientFundsError
# if withdrawal amount exceeds balance
# TODO: 定义一个函数 withdraw_money，当取款金额超过余额时抛出自定义 InsufficientFundsError
class InsufficientFundsError(Exception):
    pass


def withdraw_money(balance, amount):
    # If amount > balance, raise InsufficientFundsError with message "Insufficient funds."
    # 如果 amount > balance，用消息 "Insufficient funds." 抛出 InsufficientFundsError
    pass


# Tests to check if your code works
# 测试你的代码是否正常工作
# Testing validate_positive
# 测试 validate_positive
try:
    result_one = validate_positive(-5)
except NegativeNumberError as e:
    result_one = str(e)
    assert result_one == "Negative numbers are not allowed.", f"Expected: Negative numbers are not allowed., but got {result_one}"

result_two = validate_positive(10)
assert result_two == 10, "Positive numbers should be returned as is."

# Testing check_age
# 测试 check_age
try:
    result_three = check_age(130)
except InvalidAgeError as e:
    result_three = str(e)
    assert result_three == "Invalid age.", f"Expected: Invalid age., but got {result_three}"

result_four = check_age(25)
assert result_four == "Age is valid.", "Valid age should return confirmation message."

# Testing withdraw_money
# 测试 withdraw_money
try:
    result_five = withdraw_money(50, 100)
except InsufficientFundsError as e:
    result_five = str(e)
    assert result_five == "Insufficient funds.", f"Expected: Insufficient funds., but got {result_five}"

result_six = withdraw_money(200, 100)
assert result_six == "Transaction successful.", "Sufficient funds should allow withdrawal."

# Print results for visibility
# 打印结果以便查看
print(result_one)
print(result_two)
print(result_three)
print(result_four)
print(result_five)
print(result_six)