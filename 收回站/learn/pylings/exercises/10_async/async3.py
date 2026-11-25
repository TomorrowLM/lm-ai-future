"""
Async Exercise 3 (async3.py)
Step 3 — yield + await: asynchronous generators.
An async generator is defined with `async def` and contains both `await`
and `yield`. It can suspend for async I/O and still produce values one by
one. Consume it with `async for`. Combine them to build a data pipeline.

Follow the TODO instructions and complete each section.
"""
"""
异步练习 3（async3.py）
第三步 —— yield + await：异步生成器。
异步生成器用 `async def` 定义，同时包含 `await` 和 `yield`。
它既能因异步 I/O 而挂起，又能逐个产生值。
使用 `async for` 消费它，并可组合成数据流管道。

请按照 TODO 指示操作并完成每个部分。
"""

import asyncio


async def produce_numbers(n):
    """
    Async generator: yield numbers 1..n one by one.
    Before each yield, `await asyncio.sleep(0.01)` to simulate async I/O.
    """
    """
    异步生成器：逐个产生数字 1 到 n。
    每次 yield 前 `await asyncio.sleep(0.01)` 模拟异步 I/O。
    """
    pass  # TODO: Implement


async def double_numbers(source):
    """
    Async generator that consumes `source` with `async for`
    and yields each value multiplied by 2.
    """
    """
    异步生成器：使用 `async for` 消费 `source`，
    并 yield 每个值乘以 2 的结果。
    """
    pass  # TODO: Implement


async def main():
    """
    Should consume double_numbers(produce_numbers(5)) with `async for`,
    collect the values, and assert the result equals [2, 4, 6, 8, 10].
    """
    """
    应使用 `async for` 消费 double_numbers(produce_numbers(5))，
    收集值，并断言结果等于 [2, 4, 6, 8, 10]。
    """
    result = []
    # TODO: Use `async for` to iterate over double_numbers(produce_numbers(5))
    # TODO: 使用 `async for` 遍历 double_numbers(produce_numbers(5))
    print(f"收到数据: {result}")
    assert result == [2, 4, 6, 8, 10], f"期望 [2, 4, 6, 8, 10]，实际 {result}"
    print("测试通过！")


if __name__ == "__main__":
    asyncio.run(main())
