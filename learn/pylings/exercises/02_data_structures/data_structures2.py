"""
In this exercise, we are going to introduce the concept of tuples.

In Python, a tuple is an immutable collection of items,
which can be of different data types:

- A tuple is an ordered collection of items enclosed in parentheses `()`.

- Tuples cannot be modified after their creation (e.g., adding, removing, or changing elements is not allowed).

- Each item in a tuple has a specific index, starting from 0.

- Tuples can contain items of different data types (e.g., integers, strings, other tuples).
"""
"""
在本练习中，我们将介绍元组（tuple）的概念。

在 Python 中，元组是一种不可变的元素集合，
可以包含不同数据类型：

- 元组是用圆括号 `()` 括起来的有序元素集合。

- 元组在创建后不能被修改（例如不允许添加、删除或更改元素）。

- 元组中的每个元素都有一个特定的索引，从 0 开始。

- 元组可以包含不同数据类型的元素（例如整数、字符串、其他元组）。
"""

# TODO: Initialize a tuple of programming languages with "Python", "Java", "Rust", and "C++"
# TODO: 初始化一个包含 "Python"、"Java"、"Rust" 和 "C++" 的编程语言元组
languages = ("Python", "Java", "Rust", "C++")


# DO NOT TOUCH
# 请勿修改
assert languages == ("Python", "Java", "Rust", "C++"), f"Expected ('Python', 'Java', 'Rust', 'C++'), but got {languages}"
print(f"Languages: {languages}")

# TODO: Access the third item in the tuple, remember 0 indexed
# TODO: 访问元组中的第三个元素，记住是从 0 开始索引的
second_language = languages[2]

# DO NOT TOUCH
# 请勿修改
assert second_language == ("Rust"), f"Expected 'Rust', but got {second_language}"
print(f"Second Language: {second_language}")

# TODO: Create a new tuple by adding "JavaScript" to the existing tuple, a well placed `,` could help here
# TODO: 通过向现有元组添加 "JavaScript" 来创建一个新元组，合理放置 `,` 可能会有所帮助
new_languages = languages + ("JavaScript",)

# DO NOT TOUCH
# 请勿修改
assert new_languages == ("Python", "Java", "Rust", "C++", "JavaScript"), f"Expected ('Python', 'Java', 'Rust', 'C++', 'JavaScript'), but got {new_languages}"
print(f"New languages: {new_languages}")

# TODO: Create a new tuple by inserting "Ruby" at index 4, 
# TODO: 通过在索引 4 处插入 "Ruby" 来创建一个新元组
new_languages_with_ruby = new_languages[:4] + ("Ruby",) + new_languages[4:]

# DO NOT TOUCH
# 请勿修改
assert new_languages_with_ruby == ("Python", "Java", "Rust", "C++", "Ruby", "JavaScript"), f"Expected ('Python', 'Java', 'Rust', 'C++', 'Ruby', 'JavaScript'), but got {new_languages_with_ruby}"
print(f"New languages with ruby: {new_languages_with_ruby}")

# TODO: Create a new tuple by removing the second item
# TODO: 通过移除第二个元素来创建一个新元组
new_languages_without_second = new_languages[:1] + new_languages[2:]

# DO NOT TOUCH
# 请勿修改
assert new_languages_without_second == ("Python", "Rust", "C++", "JavaScript"), f"Expected ('Python', 'Rust', 'C++',,'JavaScript'), but got {new_languages_without_second}"
print(f"Remaining languages: {new_languages_without_second}")