"""
OOP Exercise 3 (oop3.py)
This exercise introduces inheritance and method overriding.
You will extend the Car class to create a specialized ElectricCar subclass.
Follow the TODO instructions and complete each section to pass all tests.
"""
"""
OOP 练习 3（oop3.py）
本练习介绍继承和方法重写。
你将扩展 Car 类来创建一个专用的 ElectricCar 子类。
请按照 TODO 指示操作并完成每个部分以通过所有测试。
"""

# Define the Car class
# 定义 Car 类
class Car:
    def __init__(self, brand):
        self.brand = brand
        self.speed = 0

    def accelerate(self, amount):
        self.speed += amount

    def brake(self, amount):
        self.speed = max(0, self.speed - amount)

    def __str__(self):
        return f"{self.brand} traveling at {self.speed} km/h"


# Define the ElectricCar subclass below
# 在下方定义 ElectricCar 子类
class ElectricCar(Car):
    def __init__(self, brand):
        # TODO: Call the parent class constructor using super()
        # TODO: 使用 super() 调用父类构造函数
        # TODO: Initialize battery_level to 100
        # TODO: 将 battery_level 初始化为 100
        pass

    def accelerate(self, amount):
        # TODO: Call the parent's accelerate method
        # TODO: 调用父类的 accelerate 方法
        # TODO: Decrease battery_level by 1% per acceleration
        # TODO: 每次加速将 battery_level 降低 1%
        pass
    
    def brake(self, amount):
        # TODO: Decreases the car's speed by the given amount
        # TODO: 将汽车速度减少给定的量
        # TODO: Call parents break method
        # TODO: 调用父类的 brake 方法
        # TODO: Increase battery_level by 1% per brake
        # TODO: 每次刹车将 battery_level 增加 1%
        pass

    def __str__(self):
        # Return a string showing "brand travelling at speed km/h with battery level% battery"
        # 返回一个字符串，格式为 "品牌 正在以 速度 km/h 行驶，电池电量 battery level%"
        pass

# Tests to check if your class works
# 测试你的类是否正常工作
e_car = ElectricCar("Tesla")
assert e_car.brand == "Tesla", f"Expected: Telsa, but got {e_car.brand}"
assert e_car.battery_level == 100, f"Expected: 100, but got {e_car.battery_level}"

e_car.accelerate(20)
assert e_car.speed == 20, f"Expected: 20, but got {e_car.speed}"
assert e_car.battery_level == 99, f"Expected: 99, but got {e_car.battery_level}"

e_car.brake(10)
assert e_car.speed == 10, f"Expected, 10, but got {e_car.speed}"

assert str(e_car) == "Tesla traveling at 10 km/h with 100% battery", f"Expected, Tesla traveling at 10 km/h with 100% battery, but got {str(e_car)}"

print(f"Electic car: {str(e_car)}")