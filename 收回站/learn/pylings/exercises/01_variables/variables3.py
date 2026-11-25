"""
Variables Exercise 3 (variables3.py)
This exercise focuses on string concatenation, different ways to combine variables, and string multiplication.
Follow the TODO instructions and fix any issues.
Uncomment and complete each section to pass all tests.
"""
"""
变量练习 3（variables3.py）
本练习重点学习字符串拼接、连接变量的不同方式以及字符串乘法。
请按照 TODO 指示操作并修复所有问题。取消注释并完成每个部分以通过所有测试。
"""

# === BASIC STRING CONCATENATION ===
# === 基本字符串拼接 ===
# TODO: Combine first_name and last_name into full_name using concatenation
# TODO: 使用拼接将 first_name 和 last_name 组合成 full_name

first_name = "John"
last_name = "Cleese"

# TODO: Concatenate first_name and last_name with a space in between
# TODO: 拼接 first_name 和 last_name，中间用空格隔开
full_name = first_name + " " + last_name

# === CONCATENATION WITH NUMBERS ===
# === 与数字拼接 ===
# TODO: Convert number to string and concatenate with a message
# TODO: 将数字转换为字符串并与消息拼接

age = 50

# TODO: Concatenate "I am " + age + " years old." (age must be converted to a string)
# TODO: 拼接 "I am " + age + " years old."（age 必须转换为字符串）
message = "I am " + str(age) + " years old."

# === CONCATENATION USING F-STRINGS ===
# === 使用 f-string 拼接 ===
# TODO: Use an f-string to format a message with name and age
# TODO: 使用 f-string 格式化带有姓名和年龄的消息

# TODO: Use f"{full_name} is {age} years old."
# TODO: 使用 f"{full_name} is {age} years old."
f_string_message = f"{full_name} is {age} years old."

# === CONCATENATION USING .FORMAT() ===
# === 使用 .format() 拼接 ===
# TODO: Use .format() method to create a message
# TODO: 使用 .format() 方法创建消息

# TODO: Use "{} is {} years old.".format(full_name, age)
# TODO: 使用 "{} is {} years old.".format(full_name, age)
format_message = "{} is {} years old.".format(full_name, age)

# === STRING MULTIPLICATION ===
# === 字符串乘法 ===
# TODO: Repeat a string multiple times using the * operator
# TODO: 使用 * 运算符多次重复一个字符串

repeat_word = "Hello"

# TODO: Repeat "Hello" 3 times (output: "HelloHelloHello")
# TODO: 将 "Hello" 重复 3 次（输出："HelloHelloHello"）
multiplied_string = repeat_word * 3

# === TESTS ===
# === 测试 ===
# Call the variables to test concatenation methods
# 调用变量以测试拼接方法

assert full_name == "John Cleese", f"[FAIL] Expected 'John Cleese', got '{full_name}'"
assert message == "I am 50 years old.", f"[FAIL] Expected 'I am 50 years old.', got '{message}'"
assert f_string_message == "John Cleese is 50 years old.", f"[FAIL] Expected 'John Cleese is 50 years old.', got '{f_string_message}'"
assert format_message == "John Cleese is 50 years old.", f"[FAIL] Expected 'John Cleese is 50 years old.', got '{format_message}'"
assert multiplied_string == "HelloHelloHello", f"[FAIL] Expected 'HelloHelloHello', got '{multiplied_string}'"

print(f"{full_name}")
print(f"{message}")
print(f"{f_string_message}")
print(f"{multiplied_string}")