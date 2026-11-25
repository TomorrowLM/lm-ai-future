"""
Threading Exercise 1 (threading1.py)
This program spawns multiple threads that each run for at least 1 second.
Each thread returns how much time it took to complete.
The program should wait until all the spawned threads have finished
and should collect their return values into a list.

Follow the TODO instructions and complete each section.
"""
"""
线程练习 1（threading1.py）
本程序创建多个线程，每个线程至少运行 1 秒。
每个线程返回其完成所花费的时间。
程序应等待所有创建的线程完成后，将其返回值收集到一个列表中。

请按照 TODO 指示操作并完成每个部分。
"""

import threading
import time

def worker(thread_id):
    """
    This function represents the work done by each thread.
    It should:
    - Record the start time
    - Sleep for 1 second
    - Print "Thread {thread_id} done"
    - Return the elapsed time
    """
    """
    此函数表示每个线程执行的工作。
    它应该：
    - 记录开始时间
    - 休眠 1 秒
    - 打印 "Thread {thread_id} done"
    - 返回经过的时间
    """
    pass  # TODO: Implement worker function


def main():
    """
    The main function should:
    - Create and start 5 threads
    - Ensure all threads finish execution using `.join()`
    - Collect their return values in the `results` list
    """
    """
    main 函数应该：
    - 创建并启动 5 个线程
    - 使用 `.join()` 确保所有线程完成执行
    - 将它们的返回值收集到 `results` 列表中
    """

    threads = []
    
    for i in range(5):
        # TODO: Spawn a new thread that runs `worker(i)`
        # TODO: 创建一个运行 `worker(i)` 的新线程
        pass

    results = []

    for thread in threads:
        # TODO: Collect the results of all threads into the `results` list.
        # TODO: 将所有线程的结果收集到 `results` 列表中。
        pass

    if len(results) != 5:
        raise RuntimeError("Oh no! Some thread isn't done yet!")

    print()
    for i, result in enumerate(results):
        print(f"Thread {i} took {result:.2f} seconds")


if __name__ == "__main__":
    main()