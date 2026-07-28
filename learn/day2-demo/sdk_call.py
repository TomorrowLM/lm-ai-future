from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

# 初始化 DeepSeek 服务（兼容 OpenAI SDK）
client = OpenAI(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
)

completion = client.chat.completions.create(
    model="deepseek-chat",
    response_format={"type": "json_object"},
    messages=[
        # DeepSeek 的 response_format={"type": "json_object"} 要求提示词中必须包含 "json" 字样，否则返回 400 错误。
        {"role": "system", "content": "You are a helpful assistant. Always respond in JSON format."},
        {"role": "user", "content": "Hello"}
    ]
)

print(completion.choices[0].message.content)