import asyncio
from langchain_core.tools import tool


@tool
async def amultiply(a: int, b: int) -> int:
    """Multiply two numbers."""
    await asyncio.sleep(0.1)  # 用延迟模拟 I/O 等待。
    return a * b


print(amultiply.name)
print(amultiply.description)
print(amultiply.args)


async def main():
    print(await amultiply.ainvoke({"a": 2, "b": 3}))


asyncio.run(main())
