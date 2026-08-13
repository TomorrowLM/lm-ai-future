"""
Async Exercise 1 (async1.py)
Step 1 — yield: synchronous generators.
A generator function contains `yield`. Calling it returns a generator
object and does NOT run the body yet. It runs lazily, one value at a time,
as you iterate (or call `next()`).

Follow the TODO instructions and complete each section.
"""
"""
异步练习 1（async1.py）
第一步 —— yield：同步生成器。
包含 `yield` 的函数是生成器函数。调用它只返回一个生成器对象，
并不会立即执行函数体。它会在你迭代（或调用 `next()`）时，
惰性地、一次一个地产生值。

请按照 TODO 指示操作并完成每个部分。
"""


def countdown(n):
    """
    This is a synchronous generator. It should:
    - While n > 0:
        - Print "准备生成: {n}"
        - `yield n` to produce the current value and pause
        - Decrement n by 1
    """
    """
    这是一个同步生成器。它应该：
    - 当 n > 0 时循环：
        - 打印 "准备生成: {n}"
        - `yield n` 产生当前值并暂停
        - n 减 1
    """
    while n > 0:
        print(f"准备生成: {n}")
        yield n
        n -= 1


def main():
    """
    The main function should:
    - Get a generator object by calling countdown(3)
    - Use `next()` to pull the first value and assert it is 3
    - Then consume the rest with a `for` loop, collecting into a list
    - Assert the collected values equal [3, 2, 1]
    """
    """
    main 函数应该：
    - 调用 countdown(3) 得到一个生成器对象
    - 使用 `next()` 取出第一个值并断言它是 3
    - 再用 `for` 循环消费剩余值，收集到列表中
    - 断言收集到的值等于 [3, 2, 1]
    """
    gen = countdown(3)

    # TODO: Pull the first value with next() and assert it equals 3
    # TODO: 使用 next() 取出第一个值并断言它等于 3
    first = next(gen)
    print(f"first = {first}")
    assert first == 3, f"期望第一个值为 3，实际 {first}"

    # TODO: Collect the remaining values into a list using a for loop
    # TODO: 使用 for 循环把剩余值收集到列表中
    result = [first]
    for value in gen:
        print(value)
        result.append(value)

    print(f"收到数据: {result}")
    assert result == [3, 2, 1], f"期望 [3, 2, 1]，实际 {result}"
    print("测试通过！")


if __name__ == "__main__":
    main()
