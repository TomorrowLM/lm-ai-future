"""
If Statements Exercise 2 (conditionals2.py)
This exercise introduces if-elif-else blocks in Python.
Follow the TODO instructions and fix any issues.
Uncomment and complete each section to pass all tests.
"""
"""
if 语句练习 2（conditionals2.py）
本练习介绍 Python 中的 if-elif-else 代码块。
请按照 TODO 指示操作并修复所有问题。取消注释并完成每个部分以通过所有测试。
"""

# === IF-ELIF-ELSE FUNCTION ===
# === IF-ELIF-ELSE 函数 ===
# TODO: Create a function that classifies a number as positive, negative, or zero
# TODO: 创建一个函数，将数字分类为正数、负数或零

def classify_number(number):
    if number __ 0:  # TODO: Replace __ with the correct condition for positive numbers
        return "Positive"
    elif number __ 0:  # TODO: Replace __ with the correct condition for zero
        return "Zero"
    else:
        return "Negative"

# === GRADE CLASSIFICATION FUNCTION ===
# === 成绩分类函数 ===
# TODO: Create a function that assigns a letter grade based on a score
# TODO: 创建一个函数，根据分数分配字母等级

def assign_grade(score):
    if score __ 90:  # TODO: Score >= 90
        return "A"
    elif score __ 80 :  # TODO: Score >= 80
        return "B"
    elif score __ 70:  # TODO: Score >= 70
        return "C"
    elif score __ 60:  # TODO: Score >= 60
        return "D"
    else:
        return "F"

# === TESTS ===
# === 测试 ===
# Call the functions with various inputs to test all conditions
# 使用各种输入调用函数以测试所有条件

# Test classify_number
# 测试 classify_number
result_one = classify_number(10)
assert result_one == "Positive", f"[FAIL] Expected 'Positive', got '{result_one}'"

result_two = classify_number(0)
assert result_two == "Zero", f"[FAIL] Expected 'Zero', got '{result_two}'"

result_three = classify_number(-5)
assert result_three == "Negative", f"[FAIL] Expected 'Negative', got '{result_three}'"

# Test assign_grade
# 测试 assign_grade
result_four = assign_grade(95)
assert result_four == "A", f"[FAIL] Expected 'A', got '{result_four}'"

result_five = assign_grade(85)
assert result_five == "B", f"[FAIL] Expected 'B', got '{result_five}'"

result_six = assign_grade(75)
assert result_six == "C", f"[FAIL] Expected 'C', got '{result_six}'"

result_seven = assign_grade(65)
assert result_seven == "D", f"[FAIL] Expected 'D', got '{result_seven}'"

result_eight = assign_grade(50)
assert result_eight == "F", f"[FAIL] Expected 'F', got '{result_eight}'"

print(f"\n{result_one}\n{result_two}\n{result_three}\n{result_four}\n{
    result_five}\n{result_six}\n{result_seven}\n{result_eight}.")