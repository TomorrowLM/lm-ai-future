import base64
import httpx
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
import core.config
import os

image_url = "https://pic1.arkoo.com/56D0B40F99F841DF8A2425762AE2565D/picture/o_1i4qop009177v1tgf14db15he1iaj1is.jpg"
resp = httpx.get(image_url, headers={"User-Agent": "Mozilla/5.0"})
resp.raise_for_status()
image_data = base64.b64encode(resp.content).decode("utf-8")
model = ChatOpenAI(
    model="deepseek-chat",
    base_url=os.getenv("DEEPSEEK_BASE_URL"),
    api_key=os.getenv("DEEPSEEK_API_KEY"),
)
message = HumanMessage(
    content=[
        {"type": "text", "text": "用中文描述这张图片中的天气"},
        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}},
    ],
)
print(message)
response = model.invoke([message])
print(response.content)

#response = model.invoke([message])
#print(response.content)

