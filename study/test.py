import asyncio


async def call():
    return "天空是蓝色的"


# 1. 调用 async 函数不会执行函数体，只返回协程对象（懒执行）
coro = call()
print(coro)  # <coroutine object call at 0x...>

# 2. 普通脚本没有正在运行的事件循环，必须用 asyncio.run() 启动
#    （等价于 JS 中事件循环自动 await；Python 需要显式驱动）
#    注意：如果注释掉下面这行，coro 从未被驱动，GC 回收时会警告
#    RuntimeWarning: coroutine 'call' was never awaited
print(asyncio.run(coro))  # 天空是蓝色的

# 3. 如果已经在 async 函数内部（事件循环中），才可以直接 await：
async def main():
    print('在 main 函数内部调用 call()')
    print(await call())

asyncio.run(main())