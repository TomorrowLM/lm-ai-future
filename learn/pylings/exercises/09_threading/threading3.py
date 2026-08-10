"""
Threading Exercise 3 (threading3.py)
This exercise introduces `threading.Semaphore` for resource management.
Limit concurrent access to a resource using a semaphore.
Follow the TODO instructions and complete each section.
"""
"""
线程练习 3（threading3.py）
本练习介绍使用 `threading.Semaphore` 进行资源管理。
使用信号量限制对资源的并发访问。
请按照 TODO 指示操作并完成每个部分。
"""

import threading
import time

semaphore = threading.Semaphore(3)  # TODO: Limit concurrent access to 3 threads
active_threads = 0  # Track active threads
active_threads_lock = threading.Lock()  # Lock to modify active_threads safely
max_threads_reached = 0  # Track the highest number of concurrent threads

# TODO: Implement `access_resource` to enforce semaphore limits.
# TODO: 实现 `access_resource` 以强制执行信号量限制。
def access_resource(thread_id):
    """
    This function should:
    - Acquire the semaphore before proceeding.
    - Safely increment `active_threads` inside `active_threads_lock`.
    - Ensure no more than 3 threads are active at a time.
    - Print `"Thread {thread_id} accessing resource"`.
    - Sleep for 0.1 seconds to simulate work.
    - Print `"Thread {thread_id} done"`.
    - Safely decrement `active_threads` and release the semaphore.
    """
    """
    此函数应该：
    - 在继续之前获取信号量。
    - 在 `active_threads_lock` 内安全地递增 `active_threads`。
    - 确保同时活跃的线程不超过 3 个。
    - 打印 `"Thread {thread_id} accessing resource"`。
    - 休眠 0.1 秒以模拟工作。
    - 打印 `"Thread {thread_id} done"`。
    - 安全地递减 `active_threads` 并释放信号量。
    """
    pass  # TODO: Implement function logic


def main():
    """
    The main function should:
    - Create 6 threads that run `access_resource`
    - Ensure all threads finish execution using `.join()`
    - Verify that no more than 3 threads access the resource at the same time
    """
    """
    main 函数应该：
    - 创建 6 个运行 `access_resource` 的线程
    - 使用 `.join()` 确保所有线程完成执行
    - 验证同时访问资源的线程不超过 3 个
    """

    global active_threads, max_threads_reached
    active_threads = 0  # Reset counter before running
    max_threads_reached = 0  # Reset max tracking

    threads = []

    for i in range(6):
        # TODO: Spawn a new thread that runs `access_resource(i)`
        # TODO: 创建一个运行 `access_resource(i)` 的新线程
        pass

    for thread in threads:
        # TODO: Ensure all threads finish execution
        # TODO: 确保所有线程完成执行
        pass

    # Ensure active_threads is back to zero
    # 确保 active_threads 恢复为零
    assert active_threads == 0, f"Error: active_threads should be 0 after execution, but got {active_threads}"

    # Ensure max concurrent threads never exceeded 3
    # 确保最大并发线程数从未超过 3
    assert max_threads_reached <= 3 and max_threads_reached > 0, f"Error: More than 3 threads ran concurrently! Max observed: {max_threads_reached}"

if __name__ == "__main__":
    main()