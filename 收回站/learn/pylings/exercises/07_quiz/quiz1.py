"""
OOP Quiz (oop_quiz1.py)
This quiz tests your ability to combine variables, data structures, loops, conditionals, and object-oriented programming.
You will create a simple Library system that manages books with multiple attributes.
Follow the TODO instructions and complete each section to pass all tests.
"""
"""
OOP 测验（oop_quiz1.py）
本测验测试你综合运用变量、数据结构、循环、条件语句和面向对象编程的能力。
你将创建一个简单的图书馆系统，管理具有多种属性的书籍。
请按照 TODO 指示操作并完成每个部分以通过所有测试。
"""

"""TODO: Define the Book class

Define the __init__ method
    - Initialize attributes: title, author, genre, year, and availability (set to True by default)
 
Define the borrow() method
    - Check if the book is available
    - If available, set it to unavailable and return True
    - If not available, return False

Define the return_book() method
    - Set the book's availability back to True
    - Return True if the book was successfully returned, otherwise False

Define the __str__ method
    - Return a string with book details and availability status
    - Format: "Title by Author (Genre, Year) - Available/Unavailable"
"""
"""
TODO: 定义 Book 类

定义 __init__ 方法
    - 初始化属性：title, author, genre, year 和 availability（默认为 True）

定义 borrow() 方法
    - 检查书籍是否可借
    - 如果可借，将其设为不可借并返回 True
    - 如果不可借，返回 False

定义 return_book() 方法
    - 将书籍的可借状态恢复为 True
    - 如果书籍成功归还则返回 True，否则返回 False

定义 __str__ 方法
    - 返回包含书籍详情和可借状态的字符串
    - 格式："书名 作者 (类型, 年份) - 可借/不可借"
"""

"""
TODO: Define the Library class

Define the __init__ method
    - Initialize an empty list to store books

Define the add_book() method
    - Add a book object to the list of books

Define the borrow_book() method
    - Loop through books and find the book that matches the given title
    - If found, attempt to borrow the book and return the result (True or False)

Define the return_book() method
    - Loop through books and find the book that matches the given title
    - Attempt to return the book and return the result (True or False)

Define the display_books() method
    - Loop through all books and print their status using their __str__ method
"""
"""
TODO: 定义 Library 类

定义 __init__ 方法
    - 初始化一个空列表用于存储书籍

定义 add_book() 方法
    - 将书籍对象添加到书籍列表中

定义 borrow_book() 方法
    - 遍历书籍并找到与给定标题匹配的书籍
    - 如果找到，尝试借阅该书籍并返回结果（True 或 False）

定义 return_book() 方法
    - 遍历书籍并找到与给定标题匹配的书籍
    - 尝试归还该书籍并返回结果（True 或 False）

定义 display_books() 方法
    - 遍历所有书籍并使用其 __str__ 方法打印状态
"""

# Tests to check if your code works
# 测试你的代码是否正常工作
library = Library()
book1 = Book("1984", "George Orwell", "Dystopian", 1949)
book2 = Book("Brave New World", "Aldous Huxley", "Science Fiction", 1932)
book3 = Book("Fahrenheit 451", "Ray Bradbury", "Dystopian", 1953)

library.add_book(book1)
library.add_book(book2)
library.add_book(book3)

# Borrow and return actions
# 借阅和归还操作
assert library.borrow_book("1984") == True, "Should be able to borrow '1984'"
assert library.borrow_book("1984") == False, "'1984' should not be available for borrowing again"
assert library.return_book("1984") == True, "Should be able to return '1984'"
assert library.borrow_book("1984") == True, "Should be able to borrow '1984' after returning"

# Display books
# 显示书籍
library.display_books()