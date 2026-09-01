from langchain_openai import ChatOpenAI
import asyncio
import os
import core.config

model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)

# 异步流处理
async def async_stream():
    events = []
    async for event in model.astream_events("hello", version="v2"):
        events.append(event)
    print(events)

# 运行异步流处理
asyncio.run(async_stream())
