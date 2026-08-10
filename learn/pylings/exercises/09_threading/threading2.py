"""
Threading Exercise 2 (threading2.py)
This exercise introduces thread synchronization using `threading.Lock`.
Safely increment a shared counter using multiple threads.
Follow the TODO instructions and complete each section.
"""
"""
线程练习 2（threading2.py）
本练习介绍使用 `threading.Lock` 进行线程同步。
使用多个线程安全地递增共享计数器。
请按照 TODO 指示操作并完成每个部分。
"""

import threading
import time

counter = 0  # Shared resource
lock = threading.Lock()  # TODO: Use this lock to prevent race conditions

# TODO: Define a function safe_increment that:
# - Uses `lock` to safely increment `counter` 1000 times
# - If lock is not used, race conditions may cause incorrect results
# TODO: 定义一个函数 safe_increment：
# - 使用 `lock` 安全地将 `counter` 递增 1000 次
# - 如果不使用锁，竞态条件可能导致错误结果
def safe_increment():
    pass


def main():
    """
    The main function should:
    - Create 5 threads that run `safe_increment`
    - Ensure all threads finish execution using `.join()`
    - Print the final value of `counter` (should be 5000 if correct)
    """
    """
    main 函数应该：
    - 创建 5 个运行 `safe_increment` 的线程
    - 使用 `.join()` 确保所有线程完成执行
    - 打印 `counter` 的最终值（如果正确应为 5000）
    """

    global counter
    counter = 0  # Reset counter to ensure clean test runs

    threads = []

    for _ in range(5):
        # TODO: Spawn a new thread that runs `safe_increment`
        # TODO: 创建一个运行 `safe_increment` 的新线程
        pass

    for thread in threads:
        # TODO: Ensure all threads finish execution
        # TODO: 确保所有线程完成执行
        pass

    print(f"Final counter value: {counter}")

    # Ensure correct synchronization was used
    # 确保使用了正确的同步
    assert counter == 5000, f"Error: Counter should be 5000, but got {counter}"


if __name__ == "__main__":
    main()