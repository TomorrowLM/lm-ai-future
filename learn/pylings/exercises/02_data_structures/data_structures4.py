"""
In this exercise, we are going to introduce the concept of sets through a scenario: managing unique items in a collection.

In Python, a set is an unordered collection of unique items:

- Sets are defined using curly braces `{}` or the built-in `set()` function.
- Sets do not allow duplicate values.
- Sets are unordered, meaning there is no indexing or ordering of elements.
- Sets support various operations like union, intersection, difference, and more.
"""
"""
在本练习中，我们将通过一个场景来介绍集合（set）的概念：管理集合中的唯一元素。

在 Python 中，集合是一种无序的唯一元素集合：

- 集合使用花括号 `{}` 或内置的 `set()` 函数定义。
- 集合不允许重复值。
- 集合是无序的，意味着没有索引或元素排序。
- 集合支持多种操作，如并集、交集、差集等。
"""

## DO NOT TOUCH
# 请勿修改
item_list = ["item1", "item2", "item3", "item1", "item4", "item2", "item5"]

# TODO: Convert the list to a set to remove duplicates
# TODO: 将列表转换为集合以去除重复项
unique_items = set()

# DO NOT TOUCH
# 请勿修改
assert unique_items == {"item1", "item2", "item3", "item4", "item5"}, f"Expected unique item set, but got {unique_items}"
print(f"Unique items: {unique_items}")

# TODO: Add a new item "item6" to the set
# TODO: 向集合添加新元素 "item6"
unique_items.add()

# DO NOT TOUCH
# 请勿修改
assert "item6" in unique_items, f"Expected 'item6' to be in the set, but got {unique_items}"
print(f"Items after adding 'item6': {unique_items}")

# TODO: Remove the item "item4" from the set
# TODO: 从集合中移除元素 "item4"
unique_items.remove()

# DO NOT TOUCH
# 请勿修改
assert "item4" not in unique_items, f"Expected 'item4' to be removed, but got {unique_items}"
print(f"Items after removing 'item4': {unique_items}")

# TODO: Find the difference between `unique_items` and a set of {"item2", "item5"}
# TODO: 找出 `unique_items` 与集合 {"item2", "item5"} 的差集
remaining_items = unique_items.difference()

# DO NOT TOUCH
# 请勿修改
assert remaining_items == {"item1", "item3", "item6"}, f"Expected {{'item1', 'item3', 'item6'}}, but got {remaining_items}"
print(f"Items after difference operation: {remaining_items}")