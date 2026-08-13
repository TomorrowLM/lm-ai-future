"""
In this exercise we are going to introduce the concept of lists. 

In Python, a list is a versatile and mutable collection of items,
which can be of different data types:

- A list is an ordered collection of items enclosed in square brackets `[]`.

- Lists can be modified after their creation (e.g., adding, removing, or changing elements).

- Each item in a list has a specific index, starting from 0.

- Lists can contain items of different data types (e.g., integers, strings, other lists).
"""
"""
在本练习中，我们将介绍列表（list）的概念。

在 Python 中，列表是一种多功能、可变的元素集合，
可以包含不同数据类型：

- 列表是用方括号 `[]` 括起来的有序元素集合。

- 列表在创建后可以被修改（例如添加、删除或更改元素）。

- 列表中的每个元素都有一个特定的索引，从 0 开始。

- 列表可以包含不同数据类型的元素（例如整数、字符串、其他列表）。
"""

# TODO: Initialize a list of fruits with "apple", "banana" and "cherry"
# TODO: 初始化一个包含 "apple"、"banana" 和 "cherry" 的水果列表
fruits = ["apple", "banana", "cherry"]

# DO NOT TOUCH
# 请勿修改
assert fruits == ["apple", "banana", "cherry"], f"Expected ['apple', 'banana', 'cherry'], but got {fruits}"

# TODO: Append a "pineapple" to the list
# TODO: 向列表追加一个 "pineapple"

fruits.append("pineapple")

# DO NOT TOUCH
# 请勿修改
assert fruits == ["apple", "banana", "cherry", "pineapple"], f"Expected ['apple', 'banana', 'cherry', 'pineapple'], but got {fruits}"

# TODO: Insert "elderflower" into index 3 of fruits
# TODO: 将 "elderflower" 插入到 fruits 列表的索引 3 位置
fruits.insert(3, "elderflower")

# DO NOT TOUCH
# 请勿修改
assert fruits == ["apple", "banana", "cherry", "elderflower", "pineapple"], f"Expected ['apple', 'elderberry', 'banana', 'cherry', 'date'], but got {fruits}"

# TODO: Pop the second index from fruitslist
# TODO: 从 fruits 列表中弹出索引为 2 的元素
popped_fruit = fruits.pop(1)

# DO NOT TOUCH
# 请勿修改
assert popped_fruit == "banana", f"Expected 'banana', but got {popped_fruit}"
assert fruits == ["apple", "cherry", "elderflower", "pineapple"], f"Expected ['apple', 'cherry','elderberry', 'pineapple'], but got {fruits}"

# TODO: Remove a fruit "elderflower"
# TODO: 移除水果 "elderflower"
fruits.remove("elderflower")

assert fruits == ["apple", "cherry", "pineapple"], f"Expected ['apple', 'cherry', 'pineapple'], but got {fruits}"

print(f"Remaining fruits: {fruits}")