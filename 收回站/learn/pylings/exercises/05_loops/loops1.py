"""
Loops Exercise 1 (loops1.py)
This exercise introduces basic looping constructs in Python: for loops and while loops.
Follow the TODO instructions and fix any issues.
Uncomment and complete each section to pass all tests.
"""
"""
循环练习 1（loops1.py）
本练习介绍 Python 中的基本循环结构：for 循环和 while 循环。
请按照 TODO 指示操作并修复所有问题。取消注释并完成每个部分以通过所有测试。
"""

# === FOR LOOP ===
# === FOR 循环 ===
# TODO: Modify the function so that it returns a list of numbers from 1 to n using a for loop
# TODO: 修改函数，使其使用 for 循环返回从 1 到 n 的数字列表

def generate_numbers(n):
    numbers = []
    # TODO: Use a for loop to append numbers from 1 to n to the list
    # TODO: 使用 for 循环将 1 到 n 的数字追加到列表
    pass
    return numbers

# === WHILE LOOP ===
# === WHILE 循环 ===
# TODO: Modify the function so that it sums numbers from 1 to n using a while loop and returns the total
# TODO: 修改函数，使其使用 while 循环对 1 到 n 的数字求和并返回总和

def sum_numbers(n):
    total = 0
    current = 1
    # TODO: Use a while loop to add numbers from 1 to n
    # TODO: 使用 while 循环将 1 到 n 的数字相加
    pass
    return total

# === LOOP WITH CONDITIONALS ===
# === 带条件的循环 ===
# TODO: Modify the function so that it returns a list of even numbers from 1 to n using a loop and condition
# TODO: 修改函数，使其使用循环和条件返回从 1 到 n 的偶数列表

def even_numbers(n):
    evens = []
    # TODO: Use a loop and if condition to collect even numbers
    # TODO: 使用循环和 if 条件收集偶数
    pass
    return evens

# === TESTS ===
# === 测试 ===
# Call the functions with various inputs to test all conditions
# 使用各种输入调用函数以测试所有条件

# Test generate_numbers function
# 测试 generate_numbers 函数
result_one = generate_numbers(5)
assert result_one == [1, 2, 3, 4, 5], f"[FAIL] Expected [1, 2, 3, 4, 5], got '{result_one}'"

# Test sum_numbers function
# 测试 sum_numbers 函数
result_two = sum_numbers(5)
assert result_two == 15, f"[FAIL] Expected 15, got '{result_two}'"

# Test even_numbers function
# 测试 even_numbers 函数
result_three = even_numbers(10)
assert result_three == [2, 4, 6, 8, 10], f"[FAIL] Expected [2, 4, 6, 8, 10], got '{result_three}'"

print(f"\n{result_one}\n{result_two}\n{result_three}\n")