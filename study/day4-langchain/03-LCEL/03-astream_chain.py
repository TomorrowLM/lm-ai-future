from langchain_openai import ChatOpenAI
import asyncio
from langchain_core.output_parsers import StrOutputParser
from langchain_core.prompts import ChatPromptTemplate
import os
import core.config

prompt = ChatPromptTemplate.from_template("给我讲一个关于{topic}的笑话")
model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)
parser = StrOutputParser()
chain = prompt | model | parser


async def async_stream():
    async for chunk in chain.astream({"topic": "鹦鹉"}):
        print(chunk, end="|", flush=True)

# 运行异步流处理
asyncio.run(async_stream())
