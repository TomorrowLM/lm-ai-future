from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.output_parsers import StrOutputParser
import os

import core.config

model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)

messages = [
    SystemMessage(content="将以下内容从英语翻译成中文"),
    HumanMessage(content="Let's go for a run"),
]
parser = StrOutputParser()

# 使用Chains方式调用
chain = model | parser
response = chain.invoke(messages)
print(response)
#我们去跑步吧
