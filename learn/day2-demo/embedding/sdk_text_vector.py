from openai import OpenAI
import os
from learn.config import *

# 初始化 GLM 服务（兼容 OpenAI SDK）
client = OpenAI(
    api_key=os.getenv("GLM_API_KEY"),
    base_url=os.getenv("GLM_BASE_URL"),
)


# 调用嵌入 API
def get_embedding(text, model="embedding-2"):
    response = client.embeddings.create(
        input=text,
        model=model
    )
    return response.data[0].embedding

# 示例文本
text = "Hello, world!"

# 获取嵌入向量
embedding = get_embedding(text)

print("Embedding vector:", embedding)
