"""
Variables Exercise 4 (variables4.py)
This exercise focuses on arithmetic operations, variable correction, and visualizing data using string multiplication.
Follow the TODO instructions and fix any issues.
Uncomment and complete each section to pass all tests.
"""
"""
变量练习 4（variables4.py）
本练习重点学习算术运算、变量修正以及使用字符串乘法进行数据可视化。
请按照 TODO 指示操作并修复所有问题。取消注释并完成每个部分以通过所有测试。
"""

# === VARIABLE ASSIGNMENT AND ARITHMETIC ===
# === 变量赋值与算术运算 ===
# TODO: Assign correct values to revenue and cost, then calculate profit.
# TODO: 为收入（revenue）和成本（cost）赋予正确的值，然后计算利润。

# TODO: Assign a positive integer value
# TODO: 赋一个正整数值
revenue = __  

# TODO: Assign a non-negative integer value
# TODO: 赋一个非负整数值
cost = __

# TODO: Calculate profit (revenue - cost)
# TODO: 计算利润（收入 - 成本）
profit = __ 

# === STRING MULTIPLICATION FOR VISUALIZATION ===
# === 字符串乘法可视化 ===
# TODO: Create a visual representation of cost and profit using '#' characters.
# TODO: 使用 '#' 字符创建成本和利润的可视化表示。

# TODO: Scale cost proportionally using '#' * (cost / revenue) * 25
# TODO: 使用 '#' * (cost / revenue) * 25 按比例缩放成本
cost_bar = __ 

# TODO: Scale profit proportionally using '#' * (profit / revenue) * 25
# TODO: 使用 '#' * (profit / revenue) * 25 按比例缩放利润
profit_bar = __

# === TESTS ===
# === 测试 ===
# Call the variables to test calculations
# 调用变量以测试计算结果

assert isinstance(revenue, int) and revenue > 0, f"[FAIL] Revenue must be a positive integer, got '{revenue}'"
assert isinstance(cost, int) and cost >= 0, f"[FAIL] Cost must be a non-negative integer, got '{cost}'"
assert profit == revenue - cost, f"[FAIL] Expected profit '{revenue - cost}', got '{profit}'"
assert isinstance(cost_bar, str) and isinstance(profit_bar, str), f"[FAIL] Expected cost_bar and profit_bar to be strings"

# Validate the length of the hash bars using proportional scaling
# 使用比例缩放验证柱状图长度
expected_cost_length = int((cost / revenue) * 25)
expected_profit_length = int((profit / revenue) * 25)

assert len(cost_bar) == expected_cost_length, f"[FAIL] Expected cost_bar length '{expected_cost_length}', got '{len(cost_bar)}'"
assert len(profit_bar) == expected_profit_length, f"[FAIL] Expected profit_bar length '{expected_profit_length}', got '{len(profit_bar)}'"

# === PRINT RESULTS ===
# === 打印结果 ===
print('Business revenue:', revenue)
print('Business costs:', cost)
print('The business profit is:', profit)
print('  cost: ' + cost_bar)
print('profit: ' + profit_bar)