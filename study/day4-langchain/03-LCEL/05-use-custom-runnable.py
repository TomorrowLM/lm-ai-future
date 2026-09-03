from langchain_core.output_parsers import StrOutputParser
from custom_runnable import PrefixRunnable
from langchain_openai import ChatOpenAI
import os
import core.config

model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)
chain = PrefixRunnable("请翻译为英文：") | model | StrOutputParser()

print(chain.invoke("苹果"))