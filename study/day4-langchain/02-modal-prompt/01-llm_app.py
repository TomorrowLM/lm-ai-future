# pip install --upgrade  openai langchain langchain-openai langchain_community
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
import os
import core.config

model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)
messages = [
    SystemMessage(content="将以下内容从英语翻译成中文"),
    HumanMessage(content="Apple"),
]

# 一次性等待模型生成完成，返回完整的 AIMessage
response = model.invoke(messages)
print(response)
# content='嗨！' response_metadata={'token_usage': {'completion_tokens': 4, 'prompt_tokens': 20, 'total_tokens': 24}, 'model_name': 'gpt-4-0613', 'system_fingerprint': None, 'finish_reason': 'stop', 'logprobs': None} id='run-c714e9bd-465b-4dbb-9441-e0b6e77ebd93-0' usage_metadata={'input_tokens': 20, 'output_tokens': 4, 'total_tokens': 24}

response = model.stream(messages)

for chunk in response:
    print(chunk.content, end="", flush=True)
