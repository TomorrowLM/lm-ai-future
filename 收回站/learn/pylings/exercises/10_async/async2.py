"""
Async Exercise 2 (async2.py)
Step 2 — await: coroutines and concurrency.
A coroutine is defined with `async def` and uses `await` to suspend
itself while waiting for an async operation (like `asyncio.sleep`),
yielding control back to the event loop instead of blocking it.

Follow the TODO instructions and complete each section.
"""
"""
异步练习 2（async2.py）
第二步 —— await：协程与并发。
协程用 `async def` 定义，并使用 `await` 在等待异步操作
（如 `asyncio.sleep`）时挂起自身，把控制权交还给事件循环，
而不是阻塞它。

请按照 TODO 指示操作并完成每个部分。
"""

import asyncio


async def fetch_data(task_id, delay):
    """
    Simulate an async I/O task. It should:
    - `await asyncio.sleep(delay)` to suspend without blocking
    - Return f"data-{task_id}"
    """
    """
    模拟一个异步 I/O 任务。它应该：
    - `await asyncio.sleep(delay)` 挂起而不阻塞
    - 返回 f"data-{task_id}"
    """
    await asyncio.sleep(delay)
    return f"data-{task_id}"
    pass  # TODO: Implement the coroutine


async def main():
    """
    The main coroutine should:
    - Use `await` to run a single fetch_data coroutine and check the result
    - Use `asyncio.gather` to run three coroutines concurrently
    - Collect and print the results
    - Assert the results equal ["data-1", "data-2", "data-3"]
    """
    """
    main 协程应该：
    - 使用 `await` 运行单个 fetch_data 协程并检查结果
    - 使用 `asyncio.gather` 并发运行三个协程
    - 收集并打印结果
    - 断言结果等于 ["data-1", "data-2", "data-3"]
    """
    # TODO: Await a single coroutine and assert it returns "data-1"
    # TODO: 使用 await 运行单个协程并断言返回 "data-1"
    single = None
    assert single == "data-1", f"期望 'data-1'，实际 {single}"

    # TODO: Use asyncio.gather to run the three coroutines concurrently
    # TODO: 使用 asyncio.gather 并发运行三个协程
    results = None  # TODO: replace with asyncio.gather(...)
    print(f"收到数据: {results}")
    assert results == ["data-1", "data-2", "data-3"], \
        f"期望 ['data-1', 'data-2', 'data-3']，实际 {results}"
    print("测试通过！")


if __name__ == "__main__":
    asyncio.run(main())
