"""
OOP Exercise 2 (oop2.py)
This exercise introduces Python's special methods: __str__ and __repr__.
These methods control how instances of your class are represented as strings.
Follow the TODO instructions and complete each section to pass all tests.
"""
"""
OOP 练习 2（oop2.py）
本练习介绍 Python 的特殊方法：__str__ 和 __repr__。
这些方法控制类的实例如何以字符串形式表示。
请按照 TODO 指示操作并完成每个部分以通过所有测试。
"""

# Define the Car class below
# 在下方定义 Car 类
class Car:
    def __init__(self, brand):
        # Initializes the brand attribute with the provided brand
        # 使用提供的 brand 初始化品牌属性
        self.brand = brand
        # Initializes the speed attribute to 0
        # 将速度属性 speed 初始化为 0
        self.speed = 0
        pass

    def accelerate(self, amount):
        # Increases the car's speed by the given amount
        # 将汽车速度增加给定的量
        self.speed += amount

    def brake(self, amount):
        # Decreases the car's speed by the given amount
        # 将汽车速度减少给定的量
        # Ensures the speed does not go below 0
        # 确保速度不低于 0
        self.speed = max(0, self.speed - amount)

    def __str__(self):
        # TODO: Return a the string in following format, "Toyota travelling at 20 km/h"
        # TODO: 返回以下格式的字符串："Toyota travelling at 20 km/h"
        pass

    def __repr__(self):
        # TODO: Return a technical string that shows how to recreate the object
        # TODO: 返回一个技术性字符串，显示如何重新创建该对象
        pass

# Tests to check if your class works
# 测试你的类是否正常工作
car = Car("Ford")
assert str(car) == "Ford traveling at 0 km/h", f"Should get, Ford traveling at 0 km/h, but got {str(car)}"

car.accelerate(50)
assert str(car) == "Ford traveling at 50 km/h", f"Should get, Ford traveling at 50 km/h, but got {str(car)}"
assert repr(car) == "Car('Ford', 50)", f"Should return a recreatable object representation, Car('Ford', 50), but got {repr(car)}"

print(f"Car:\n\t{car.brand}\n\t{car.speed}")
