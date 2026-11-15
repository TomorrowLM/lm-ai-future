from langchain_core.tools import StructuredTool
import asyncio

def multiply(a: int, b: int) -> int:
    """Multiply two numbers."""
    return a * b

async def amultiply(a: int, b: int) -> int:
    """Multiply two numbers."""
    await asyncio.sleep(0.1)  # 用延迟模拟 I/O 等待。
    return a * b

async def main():
    calculator = StructuredTool.from_function(func=multiply, coroutine=amultiply)
    print(calculator.invoke({"a": 2, "b": 3}))
    print(await calculator.ainvoke({"a": 2, "b": 5}))

asyncio.run(main())
