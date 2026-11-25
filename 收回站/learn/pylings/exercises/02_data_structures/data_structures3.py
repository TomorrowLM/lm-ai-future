"""
In this exercise, we are going to introduce the concept of dictionaries.

In Python, a dictionary is an unordered collection of key-value pairs:

- A dictionary is defined using curly braces `{}` with key-value pairs separated by colons `:`.

- Keys must be unique and immutable (e.g., strings, numbers, tuples).

- Values can be of any data type and can be duplicated.

- Dictionaries allow fast access to values when you know the key.
"""
"""
在本练习中，我们将介绍字典（dictionary）的概念。

在 Python 中，字典是一种无序的键值对集合：

- 字典使用花括号 `{}` 定义，键值对之间用冒号 `:` 分隔。

- 键必须是唯一且不可变的（例如字符串、数字、元组）。

- 值可以是任何数据类型，且可以重复。

- 字典在你已知键的情况下可以快速访问对应的值。
"""

# TODO: Initialize a dictionary with programming book titles as keys and a dictionary of details (author, year, price) as values:
# "Clean Code": {"author": "Robert C. Martin", "year": 2008, "price": 30},
# "The Pragmatic Programmer": {"author": "Andrew Hunt and David Thomas", "year": 1999, "price": 25},
# "Introduction to Algorithms": {"author": "Cormen, Leiserson, Rivest, and Stein", "year": 2009, "price": 100},
# "Python Crash Course": {"author": "Eric Matthes", "year": 2015, "price": 40}
# TODO: 初始化一个字典，以编程书籍标题为键，以详细信息字典（作者, 年份, 价格）为值：
# "Clean Code": {"author": "Robert C. Martin", "year": 2008, "price": 30},
# "The Pragmatic Programmer": {"author": "Andrew Hunt and David Thomas", "year": 1999, "price": 25},
# "Introduction to Algorithms": {"author": "Cormen, Leiserson, Rivest, and Stein", "year": 2009, "price": 100},
# "Python Crash Course": {"author": "Eric Matthes", "year": 2015, "price": 40}
books = {
    "Clean Code": {"author": "Robert C. Martin", "year": 2008, "price": 30},
    "The Pragmatic Programmer": {"author": "Andrew Hunt and David Thomas", "year": 1999, "price": 25},
    "Introduction to Algorithms": {"author": "Cormen, Leiserson, Rivest, and Stein", "year": 2009, "price": 100},
    "Python Crash Course": {"author": "Eric Matthes", "year": 2015, "price": 40}
}

# DO NOT TOUCH
# 请勿修改
assert books == {
    "Clean Code": {"author": "Robert C. Martin", "year": 2008, "price": 30},
    "The Pragmatic Programmer": {"author": "Andrew Hunt and David Thomas", "year": 1999, "price": 25},
    "Introduction to Algorithms": {"author": "Cormen, Leiserson, Rivest, and Stein", "year": 2009, "price": 100},
    "Python Crash Course": {"author": "Eric Matthes", "year": 2015, "price": 40}
}, f"Expected correct dictionary, but got {books}"
print(f"Books: {books}")

# TODO: Access the author of "Clean Code" from the dictionary
# TODO: 从字典中访问 "Clean Code" 的作者
clean_code_author = books["Clean Code"]["author"]

# DO NOT TOUCH
# 请勿修改
assert clean_code_author == "Robert C. Martin", f"Expected 'Robert C. Martin', but got {clean_code_author}"
print(f"Author of Clean Code: {clean_code_author}")

# TODO: Add a new book "Design Patterns" with author "Erich Gamma et al.", year 1994, and price 50
# TODO: 添加一本新书 "Design Patterns"，作者为 "Erich Gamma et al."，年份 1994，价格 50
books["Design Patterns"] = {"author": "Erich Gamma et al.", "year": 1994, "price": 50}

# DO NOT TOUCH
# 请勿修改
assert books["Design Patterns"] == {"author": "Erich Gamma et al.", "year": 1994, "price": 50}, f"Expected 'Erich Gamma et al.', but got {books.get('Design Patterns')}"
print(f"Updated books: {books}")

# TODO: Remove the entry for "Python Crash Course" and store it in `removed_book`
# TODO: 移除 "Python Crash Course" 的条目并将其存储在 `removed_book` 中
removed_book = books.pop("Python Crash Course")

# DO NOT TOUCH
# 请勿修改
assert removed_book == {"author": "Eric Matthes", "year": 2015, "price": 40}, f"Expected 'Eric Matthes', but got {removed_book}"
assert "Python Crash Course" not in books, "Python Crash Course should be removed from the dictionary"
print(f"Books after removal: {books}")

# TODO: Update the author of "Introduction to Algorithms" to 'CLRS'
# TODO: 将 "Introduction to Algorithms" 的作者更新为 'CLRS'
books["Introduction to Algorithms"]["author"] = "CLRS"

# DO NOT TOUCH
# 请勿修改
assert books["Introduction to Algorithms"]["author"] == "CLRS", f"Expected 'CLRS', but got {books['Introduction to Algorithms']['author']})"
print(f"Books after update: {books}")