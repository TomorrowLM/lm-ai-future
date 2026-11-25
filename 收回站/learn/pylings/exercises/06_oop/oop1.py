"""
OOP Exercise 1 (oop1.py)
This exercise introduces basic Object-Oriented Programming (OOP) concepts in Python: 
defining classes, initializing attributes, and creating methods.
Follow the TODO instructions and complete each section to pass all tests.
"""
"""
OOP 练习 1（oop1.py）
本练习介绍 Python 中基本的面向对象编程（OOP）概念：
定义类、初始化属性和创建方法。
请按照 TODO 指示操作并完成每个部分以通过所有测试。
"""

# Define the Car class below
# 在下方定义 Car 类
class Car:
    def __init__(self, brand):
        # TODO: Initialize the brand attribute with the provided brand
        # TODO: 使用提供的 brand 初始化品牌属性
        # TODO: Initialize the speed attribute to 0
        # TODO: 将速度属性 speed 初始化为 0
        pass

    def accelerate(self, amount):
        # TODO: Increase the car's speed by the given amount
        # TODO: 将汽车速度增加给定的量
        pass

    def brake(self, amount):
        # TODO: Decrease the car's speed by the given amount
        # TODO: 将汽车速度减少给定的量
        # TODO: Ensure the speed does not go below 0
        # TODO: 确保速度不低于 0
        pass

# DO NOT TOUCH 
# 请勿修改
car = Car("Toyota")
assert car.brand == f"Toyota", "Brand should be set during initialization, got {car.brand}"
assert car.speed == 0, f"Initial speed should be 0, got {car.speed}"

car.accelerate(30)
assert car.speed == 30, f"Speed should be 30 after accelerating by 30, got {car.speed}"

car.brake(10)
assert car.speed == 20, f"Speed should be 20 after braking by 10, got {car.speed}"

car.brake(25)
assert car.speed == 0, f"Speed should never go below 0, got {car.speed}"

print(f"Car:\n\tBrand: {car.brand}\n\tSpeed: {car.speed}")