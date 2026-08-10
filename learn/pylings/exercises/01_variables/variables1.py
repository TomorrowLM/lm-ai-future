"""
Welcome to the Pylings variable exercise!
Your goal is to practice working with variables in Python.

"""
"""
欢迎来到 Pylings 变量练习！
你的目标是练习在 Python 中使用变量。
"""

# TODO: Assign the name of your operating system to the variable 'MY_OS'
# TODO: 将你操作系统的名称赋值给变量 'MY_OS'
MY_OS = 'mac'

# TODO: Assign a whole NUMBER to the variable `NUMBER`.
# TODO: 将一个整数赋值给变量 `NUMBER`。
NUMBER = 3

# TODO: Assign a float value to the `FRACTIONAL` variable
# TODO: 将一个浮点数赋值给变量 `FRACTIONAL`
FRACTIONAL = 3.14

# TODO: Create a new variable 'IS_LEARNING_PYTHON' and set it to True.
# TODO: 创建一个新变量 'IS_LEARNING_PYTHON' 并将其设为 True。
IS_LEARNING_PYTHON = True

# TODO: Finish definition of 'NUMBER_INCREMENTED' by incrementing `NUMBER` by 1.
# TODO: 通过将 `NUMBER` 加 1 来完成 'NUMBER_INCREMENTED' 的定义。
NUMBER_INCREMENTED = NUMBER + 1

# === TESTS ===
# === 测试 ===
# DO NOT TOUCH
# 请勿修改
assert isinstance(MY_OS, str), f"Expected a string, but got {type(MY_OS).__name__}"
assert isinstance(NUMBER, int), f"Expected an integer, but got {type(NUMBER).__name__}"
assert isinstance(FRACTIONAL, float), f"Expected a float, but got {type(FRACTIONAL).__name__}"
assert isinstance(IS_LEARNING_PYTHON, bool), f"Expected a boolean, but got {type(IS_LEARNING_PYTHON).__name__}"
assert IS_LEARNING_PYTHON is True, f"Expected True, but got {IS_LEARNING_PYTHON}"
assert NUMBER_INCREMENTED == NUMBER + 1, f"Expected {NUMBER + 1}, but got {NUMBER_INCREMENTED}"

# Print the variables to see their values.
# 打印变量以查看它们的值。
print("My Operating System is:", MY_OS)
print("This is a whole NUMBER:", NUMBER)
print("This is a FRACTIONAL NUMBER:", FRACTIONAL)
print("Am I learning Python?", IS_LEARNING_PYTHON)
print("The NUMBER has been increased:", NUMBER_INCREMENTED)